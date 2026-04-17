/**
 * 数据工厂服务 - Phase 4 核心逻辑
 * 包含：月度账户创建、余额结转、超支冻结、公积金划转
 */

const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// 引入模型
const {
  TeamAccount,
  OrgStructure,
  GlobalConfig,
  BonusAllocationDetail,
  MonthlyCost,
  Payment
} = require('../models');

class DataFactoryService {
  constructor() {
    this.logger = console;
  }

  /**
   * ====================
   * 任务1: 月度账户自动创建
   * ====================
   * 每月1日凌晨自动为所有团队创建当月账户
   */
  async createMonthlyAccounts(targetMonth = null) {
    const month = targetMonth || dayjs().format('YYYY-MM-01');
    this.logger.log(`[数据工厂] 开始创建 ${month} 月度账户...`);

    try {
      // 1. 获取所有团队组织
      const teams = await OrgStructure.findAll({
        where: { orgType: '团队' }
      });

      // 2. 获取全局配置
      const config = await GlobalConfig.findOne();
      const startFundAmount = config?.startFundAmount || 1000000;

      // 3. 获取上月数据（用于结转）
      const prevMonth = dayjs(month).subtract(1, 'month').format('YYYY-MM-01');
      const prevAccounts = await TeamAccount.findAll({
        where: { belongMonth: prevMonth }
      });
      const prevAccountMap = new Map(prevAccounts.map(a => [a.orgId, a]));

      // 4. 批量创建/更新月度账户
      const results = [];
      for (const team of teams) {
        const result = await this._createOrUpdateTeamAccount(
          team, 
          month, 
          prevAccountMap.get(team.orgId),
          startFundAmount
        );
        results.push(result);
      }

      const created = results.filter(r => r.status === 'created').length;
      const updated = results.filter(r => r.status === 'existing').length;

      this.logger.log(`[数据工厂] 月度账户创建完成: 新建${created}个, 已存在${updated}个`);
      return {
        success: true,
        month,
        created,
        updated,
        details: results
      };

    } catch (error) {
      this.logger.error('[数据工厂] 月度账户创建失败:', error);
      throw error;
    }
  }

  /**
   * 创建或更新单个团队账户
   */
  async _createOrUpdateTeamAccount(team, month, prevAccount, defaultStartFund) {
    // 检查是否已存在
    const existing = await TeamAccount.findOne({
      where: { orgId: team.orgId, belongMonth: month }
    });

    if (existing) {
      return { orgId: team.orgId, status: 'existing', accountId: existing.accountId };
    }

    // 生成账户ID: ACC-团队ID-年月
    const yearMonth = dayjs(month).format('YYYYMM');
    const accountId = `ACC-${team.orgId}-${yearMonth}`;

    // 计算期初余额
    let openingBalance = defaultStartFund;
    if (prevAccount) {
      // 上期期末余额作为本期期初
      openingBalance = parseFloat(prevAccount.closingBalance);
    } else if (team.startFundAmount) {
      // 使用团队配置的启动资金
      openingBalance = parseFloat(team.startFundAmount);
    }

    // 创建账户
    const account = await TeamAccount.create({
      accountId,
      orgId: team.orgId,
      belongMonth: month,
      openingBalance,
      monthlyReceivedBonus: 0,
      monthlyCostConsumption: 0,
      monthlyProvidentFund: 0,
      monthlyOverdraft: 0,
      closingBalance: openingBalance,
      cumulativeOverdraftRatio: 0,
      accountStatus: prevAccount?.accountStatus || team.currentStatus || '健康',
      managerPerformanceRatio: 1.0,
      dataUpdatedAt: new Date()
    });

    return { orgId: team.orgId, status: 'created', accountId };
  }

  /**
   * ====================
   * 任务2: 日结任务 - 每日更新账户数据
   * ====================
   * 每日凌晨汇总前一天的回款和成本数据
   */
  async dailySettlement(targetDate = null) {
    const date = targetDate || dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const month = dayjs(date).format('YYYY-MM-01');
    
    this.logger.log(`[数据工厂] 开始 ${date} 日结任务...`);

    try {
      // 1. 确保当月账户已创建
      await this.createMonthlyAccounts(month);

      // 2. 汇总当日回款奖金
      await this._updateDailyBonus(date, month);

      // 3. 汇总当日成本消耗
      await this._updateDailyCost(date, month);

      // 4. 重新计算所有团队期末余额
      await this._recalculateClosingBalances(month);

      this.logger.log(`[数据工厂] ${date} 日结完成`);
      return { success: true, date, month };

    } catch (error) {
      this.logger.error('[数据工厂] 日结任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新当日回款奖金
   */
  async _updateDailyBonus(date, month) {
    // 查询当日审批通过的回款
    const payments = await Payment.findAll({
      where: {
        approvalDate: date,
        approvalStatus: '已通过'
      }
    });

    // 按团队汇总奖金
    const bonusByTeam = {};
    for (const payment of payments) {
      const details = await BonusAllocationDetail.findAll({
        where: { paymentId: payment.paymentId }
      });
      
      for (const detail of details) {
        const orgId = detail.orgId;
        if (!bonusByTeam[orgId]) bonusByTeam[orgId] = 0;
        bonusByTeam[orgId] += parseFloat(detail.allocationAmount || 0);
      }
    }

    // 更新各团队账户
    for (const [orgId, bonusAmount] of Object.entries(bonusByTeam)) {
      const account = await TeamAccount.findOne({
        where: { orgId, belongMonth: month }
      });
      
      if (account) {
        const currentBonus = parseFloat(account.monthlyReceivedBonus || 0);
        account.monthlyReceivedBonus = currentBonus + bonusAmount;
        account.dataUpdatedAt = new Date();
        await account.save();
      }
    }

    this.logger.log(`[数据工厂] 更新 ${Object.keys(bonusByTeam).length} 个团队奖金`);
  }

  /**
   * 更新当日成本消耗
   */
  async _updateDailyCost(date, month) {
    // 这里假设成本数据是按月导入的，日结只做汇总
    // 实际实现可能需要查询成本明细表
    const costs = await MonthlyCost.findAll({
      where: { costMonth: month }
    });

    const costByTeam = {};
    for (const cost of costs) {
      // 成本拆分后的归属团队
      const splits = cost.splitResult ? JSON.parse(cost.splitResult) : [];
      for (const split of splits) {
        const orgId = split.orgId;
        if (!costByTeam[orgId]) costByTeam[orgId] = 0;
        costByTeam[orgId] += parseFloat(split.amount || 0);
      }
    }

    // 更新各团队账户
    for (const [orgId, costAmount] of Object.entries(costByTeam)) {
      const account = await TeamAccount.findOne({
        where: { orgId, belongMonth: month }
      });
      
      if (account) {
        account.monthlyCostConsumption = costAmount;
        account.dataUpdatedAt = new Date();
        await account.save();
      }
    }
  }

  /**
   * 重新计算所有团队的期末余额
   */
  async _recalculateClosingBalances(month) {
    const accounts = await TeamAccount.findAll({
      where: { belongMonth: month },
      include: [{ model: OrgStructure }]
    });

    for (const account of accounts) {
      const opening = parseFloat(account.openingBalance || 0);
      const bonus = parseFloat(account.monthlyReceivedBonus || 0);
      const cost = parseFloat(account.monthlyCostConsumption || 0);
      const provident = parseFloat(account.monthlyProvidentFund || 0);
      const overdraft = parseFloat(account.monthlyOverdraft || 0);

      // 期末余额 = 期初 + 回款奖金 - 成本消耗 - 公积金 - 透支
      const closing = opening + bonus - cost - provident - overdraft;
      account.closingBalance = closing;

      // 计算累计透支比例
      if (opening > 0) {
        const overdraftRatio = ((opening - closing) / opening) * 100;
        account.cumulativeOverdraftRatio = Math.max(0, overdraftRatio);
      }

      await account.save();
    }
  }

  /**
   * ====================
   * 任务3: 超支检测与冻结
   * ====================
   * 检测团队超支情况，触发预警或冻结
   */
  async checkOverdraftAndFreeze() {
    this.logger.log('[数据工厂] 开始超支检测...');

    try {
      const config = await GlobalConfig.findOne();
      const warningLine = config?.overdraftWarningLine || 50;
      const protectionLine = config?.protectionTriggerLine || 80;

      const currentMonth = dayjs().format('YYYY-MM-01');
      const accounts = await TeamAccount.findAll({
        where: { belongMonth: currentMonth },
        include: [{ model: OrgStructure }]
      });

      const results = {
        warnings: [],
        frozen: [],
        protected: []
      };

      for (const account of accounts) {
        const ratio = parseFloat(account.cumulativeOverdraftRatio || 0);
        const org = account.OrgStructure;

        // 保护期检测
        if (org?.currentStatus === '保护期') {
          results.protected.push({
            orgId: account.orgId,
            orgName: org?.orgName,
            ratio
          });
          continue;
        }

        // 超支冻结检测 (超过80%)
        if (ratio >= protectionLine) {
          account.accountStatus = '冻结';
          await account.save();
          
          // 同步更新组织状态
          if (org) {
            org.currentStatus = '冻结';
            await org.save();
          }

          results.frozen.push({
            orgId: account.orgId,
            orgName: org?.orgName,
            ratio,
            line: protectionLine
          });
        }
        // 预警检测 (超过50%)
        else if (ratio >= warningLine) {
          account.accountStatus = '预警';
          await account.save();
          
          if (org && org.currentStatus !== '预警') {
            org.currentStatus = '预警';
            await org.save();
          }

          results.warnings.push({
            orgId: account.orgId,
            orgName: org?.orgName,
            ratio,
            line: warningLine
          });
        }
        // 恢复健康
        else if (account.accountStatus !== '健康') {
          account.accountStatus = '健康';
          await account.save();
          
          if (org && org.currentStatus !== '健康') {
            org.currentStatus = '健康';
            await org.save();
          }
        }
      }

      this.logger.log(`[数据工厂] 超支检测完成: ${results.warnings.length}个预警, ${results.frozen.length}个冻结, ${results.protected.length}个保护期`);
      return results;

    } catch (error) {
      this.logger.error('[数据工厂] 超支检测失败:', error);
      throw error;
    }
  }

  /**
   * ====================
   * 任务4: 公积金自动划转
   * ====================
   * 每月根据团队盈利情况自动划转公积金
   */
  async autoTransferProvidentFund(targetMonth = null) {
    const month = targetMonth || dayjs().format('YYYY-MM-01');
    this.logger.log(`[数据工厂] 开始 ${month} 公积金划转...`);

    try {
      const config = await GlobalConfig.findOne();
      const providentRate = config?.providentFundRate || 20; // 默认20%

      const accounts = await TeamAccount.findAll({
        where: { belongMonth: month },
        include: [{ model: OrgStructure }]
      });

      const transfers = [];
      for (const account of accounts) {
        const bonus = parseFloat(account.monthlyReceivedBonus || 0);
        const cost = parseFloat(account.monthlyCostConsumption || 0);
        
        // 盈利 = 回款奖金 - 成本消耗
        const profit = bonus - cost;
        
        if (profit > 0) {
          // 应划转公积金 = 盈利 * 比例
          const providentAmount = profit * (providentRate / 100);
          
          account.monthlyProvidentFund = providentAmount;
          account.dataUpdatedAt = new Date();
          await account.save();

          // 更新组织公积金余额
          const org = account.OrgStructure;
          if (org) {
            const currentBalance = parseFloat(org.providentFundBalance || 0);
            org.providentFundBalance = currentBalance + providentAmount;
            await org.save();
          }

          transfers.push({
            orgId: account.orgId,
            orgName: org?.orgName,
            profit,
            providentAmount,
            rate: providentRate
          });
        }
      }

      // 重新计算期末余额
      await this._recalculateClosingBalances(month);

      this.logger.log(`[数据工厂] 公积金划转完成: ${transfers.length}个团队, 总额${transfers.reduce((s, t) => s + t.providentAmount, 0).toFixed(2)}`);
      return {
        success: true,
        month,
        transfers,
        totalAmount: transfers.reduce((s, t) => s + t.providentAmount, 0)
      };

    } catch (error) {
      this.logger.error('[数据工厂] 公积金划转失败:', error);
      throw error;
    }
  }

  /**
   * ====================
   * 任务5: 保护期检查
   * ====================
   * 检查冻结团队是否满足保护期触发条件
   */
  async checkProtectionPeriod() {
    this.logger.log('[数据工厂] 开始保护期检查...');

    try {
      const config = await GlobalConfig.findOne();
      const protectionMonths = config?.protectionPeriodMonths || 6;
      const protectionRate = config?.protectionInterestRate || 6;

      // 获取所有冻结状态的团队
      const frozenOrgs = await OrgStructure.findAll({
        where: { currentStatus: '冻结' }
      });

      const results = [];
      for (const org of frozenOrgs) {
        // 检查连续冻结月数
        const frozenMonths = await this._getConsecutiveFrozenMonths(org.orgId);
        
        if (frozenMonths >= 2) {
          // 触发保护期
          org.currentStatus = '保护期';
          await org.save();

          // 创建保护期记录
          const currentMonth = dayjs().format('YYYY-MM-01');
          const endMonth = dayjs().add(protectionMonths, 'month').format('YYYY-MM-01');

          results.push({
            orgId: org.orgId,
            orgName: org.orgName,
            startMonth: currentMonth,
            endMonth,
            interestRate: protectionRate,
            frozenMonths
          });
        }
      }

      this.logger.log(`[数据工厂] 保护期检查完成: ${results.length}个团队进入保护期`);
      return results;

    } catch (error) {
      this.logger.error('[数据工厂] 保护期检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取团队连续冻结月数
   */
  async _getConsecutiveFrozenMonths(orgId) {
    const recentMonths = [];
    for (let i = 0; i < 6; i++) {
      recentMonths.push(dayjs().subtract(i, 'month').format('YYYY-MM-01'));
    }

    const accounts = await TeamAccount.findAll({
      where: {
        orgId,
        belongMonth: { [Op.in]: recentMonths }
      },
      order: [['belong_month', 'DESC']]
    });

    let consecutiveFrozen = 0;
    for (const account of accounts) {
      if (account.accountStatus === '冻结' || account.accountStatus === '保护期') {
        consecutiveFrozen++;
      } else {
        break;
      }
    }

    return consecutiveFrozen;
  }

  /**
   * ====================
   * 手动触发 - 月度结算
   * ====================
   * 月末手动触发的完整结算流程
   */
  async monthlySettlement(targetMonth = null) {
    const month = targetMonth || dayjs().subtract(1, 'month').format('YYYY-MM-01');
    this.logger.log(`[数据工厂] 开始 ${month} 月度结算...`);

    try {
      // 1. 确保月度账户存在
      await this.createMonthlyAccounts(month);

      // 2. 汇总全月数据
      await this._updateMonthlyBonus(month);
      await this._updateMonthlyCost(month);

      // 3. 公积金划转
      await this.autoTransferProvidentFund(month);

      // 4. 重新计算余额
      await this._recalculateClosingBalances(month);

      // 5. 超支检测
      await this.checkOverdraftAndFreeze();

      // 6. 保护期检查
      await this.checkProtectionPeriod();

      this.logger.log(`[数据工厂] ${month} 月度结算完成`);
      return { success: true, month };

    } catch (error) {
      this.logger.error('[数据工厂] 月度结算失败:', error);
      throw error;
    }
  }

  /**
   * 更新全月奖金汇总
   */
  async _updateMonthlyBonus(month) {
    const startOfMonth = dayjs(month).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs(month).endOf('month').format('YYYY-MM-DD');

    const payments = await Payment.findAll({
      where: {
        approvalDate: {
          [Op.between]: [startOfMonth, endOfMonth]
        },
        approvalStatus: '已通过'
      }
    });

    // 重置所有账户的月度奖金
    await TeamAccount.update(
      { monthlyReceivedBonus: 0 },
      { where: { belongMonth: month } }
    );

    // 重新汇总
    for (const payment of payments) {
      const details = await BonusAllocationDetail.findAll({
        where: { paymentId: payment.paymentId }
      });

      for (const detail of details) {
        const account = await TeamAccount.findOne({
          where: { orgId: detail.orgId, belongMonth: month }
        });

        if (account) {
          const currentBonus = parseFloat(account.monthlyReceivedBonus || 0);
          account.monthlyReceivedBonus = currentBonus + parseFloat(detail.allocationAmount || 0);
          await account.save();
        }
      }
    }
  }

  /**
   * 更新全月成本汇总
   */
  async _updateMonthlyCost(month) {
    const costs = await MonthlyCost.findAll({
      where: { costMonth: month, confirmationStatus: '已确认' }
    });

    // 按团队汇总成本
    const costByTeam = {};
    for (const cost of costs) {
      const splits = cost.splitResult ? JSON.parse(cost.splitResult) : [];
      for (const split of splits) {
        if (!costByTeam[split.orgId]) costByTeam[split.orgId] = 0;
        costByTeam[split.orgId] += parseFloat(split.amount || 0);
      }
    }

    // 重置并更新
    await TeamAccount.update(
      { monthlyCostConsumption: 0 },
      { where: { belongMonth: month } }
    );

    for (const [orgId, amount] of Object.entries(costByTeam)) {
      await TeamAccount.update(
        { monthlyCostConsumption: amount },
        { where: { orgId, belongMonth: month } }
      );
    }
  }
}

module.exports = new DataFactoryService();
