const { validationResult } = require('express-validator');
const { MonthlyCost, Employee, OrgStructure, ProjectEmp, EmpHistory, TeamAccount, GlobalConfig } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

class MonthlyCostController {
  // 获取月度成本列表
  async getList(req, res) {
    try {
      const { month, orgId, status, page = 1, limit = 50 } = req.query;
      const where = {};
      if (month) where.belongMonth = month;
      if (status) where.status = status;
      if (orgId) where.orgId = orgId;

      const { count, rows } = await MonthlyCost.findAndCountAll({
        where,
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['empId', 'name', 'orgId'],
          include: [{
            model: OrgStructure,
            as: 'organization',
            attributes: ['orgId', 'orgName']
          }]
        }],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['belongMonth', 'DESC'], ['createdAt', 'DESC']]
      });

      res.json(success({
        list: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }));
    } catch (err) {
      res.status(500).json(error(500, '获取成本列表失败', err.message));
    }
  }

  // 导入月度成本 (Excel)
  async importExcel(req, res) {
    try {
      const { month, orgId, data } = req.body;
      const results = [];
      const errors = [];

      for (const row of data) {
        try {
          const employee = await Employee.findOne({ where: { empId: row.工号 } });
          if (!employee) {
            errors.push({ 工号: row.工号, 错误: '人员不存在' });
            continue;
          }

          // 生成recordId
          const last = await MonthlyCost.findOne({ order: [['recordId', 'DESC']] });
          const lastNum = last ? parseInt(last.recordId.slice(2)) : 0;
          const newId = `MC${String(lastNum + 1).padStart(6, '0')}`;

          const cost = await MonthlyCost.create({
            recordId: newId,
            empId: row.工号,
            belongMonth: month,
            costType: row.成本类型 || '标准成本',
            originalCostStandard: employee.defaultCostStandard,
            appliedCostStandard: row.应用成本标准 || employee.defaultCostStandard,
            costSource: '导入',
            orgId,
            status: '草稿'
          });

          results.push(cost);
        } catch (err) {
          errors.push({ 工号: row.工号, 错误: err.message });
        }
      }

      res.json(success({ success: results, errors }, `成功导入${results.length}条，失败${errors.length}条`));
    } catch (err) {
      res.status(500).json(error(500, '导入失败', err.message));
    }
  }

  // **核心逻辑: 月度成本拆分计算**
  async calculateSplit(req, res) {
    try {
      const { month } = req.body;
      const results = [];

      // 获取当月所有草稿状态的成本记录
      const costs = await MonthlyCost.findAll({
        where: { belongMonth: month, status: '草稿' },
        include: [{
          model: Employee,
          as: 'employee',
          include: [{
            model: OrgStructure,
            as: 'organization'
          }]
        }]
      });

      for (const cost of costs) {
        const employee = cost.employee;
        const currentOrg = employee.organization;
        
        let splitResult;
        
        if (employee.canCrossTeam) {
          // 跨团队人员: 按参与项目拆分
          splitResult = await this.calculateCrossTeamSplit(cost, employee, month);
        } else {
          // 非跨团队人员: 检查是否有调岗历史
          splitResult = await this.calculateWithTransferHistory(cost, employee, month);
        }

        // 更新成本记录
        await cost.update({
          allocatedCost: splitResult.allocatedCost,
          splitRatio: splitResult.splitRatio,
          finalCost: splitResult.finalCost,
          status: '已提交'
        });

        results.push({
          recordId: cost.recordId,
          empId: cost.empId,
          empName: employee.name,
          ...splitResult
        });

        // 累加到团队月度账户
        await this.updateTeamAccount(splitResult, month);
      }

      res.json(success(results, '成本拆分计算完成'));
    } catch (err) {
      res.status(500).json(error(500, '计算失败', err.message));
    }
  }

  // 跨团队人员成本拆分
  async calculateCrossTeamSplit(cost, employee, month) {
    // 查询当月参与的所有项目
    const monthStart = dayjs(month).startOf('month');
    const monthEnd = dayjs(month).endOf('month');

    const projectEmps = await ProjectEmp.findAll({
      where: {
        empId: employee.empId,
        [Op.or]: [
          { leaveDate: null },
          { leaveDate: { [Op.gte]: monthStart.toDate() } }
        ],
        joinDate: { [Op.lte]: monthEnd.toDate() }
      },
      include: [{
        model: require('../models/Project'),
        include: [{
          model: require('../models/ProjectTeam'),
          include: [{ model: OrgStructure, as: 'organization' }]
        }]
      }]
    });

    if (projectEmps.length === 0) {
      // 没有参与项目，成本全部计入当前组织
      return {
        allocatedCost: cost.appliedCostStandard,
        splitRatio: 1.00,
        finalCost: cost.appliedCostStandard,
        allocations: [{
          orgId: employee.orgId,
          ratio: 1.00,
          amount: cost.appliedCostStandard,
          type: 'current_org'
        }]
      };
    }

    // 按项目分配比例拆分
    let totalCost = 0;
    const allocations = [];

    for (const pe of projectEmps) {
      const project = pe.Project;
      const teamAlloc = project.ProjectTeams?.[0];
      
      if (teamAlloc) {
        const amount = cost.appliedCostStandard * (teamAlloc.allocationRatio / 100);
        totalCost += amount;
        allocations.push({
          orgId: teamAlloc.orgId,
          projectId: project.projectId,
          ratio: teamAlloc.allocationRatio / 100,
          amount,
          type: 'project_share'
        });
      }
    }

    return {
      allocatedCost: cost.appliedCostStandard,
      splitRatio: 1.00,
      finalCost: totalCost,
      allocations
    };
  }

  // 考虑调岗历史的成本拆分
  async calculateWithTransferHistory(cost, employee, month) {
    const monthStr = dayjs(month).format('YYYY-MM');
    
    // 查询当月是否有调岗记录
    const transfers = await EmpHistory.findAll({
      where: {
        empId: employee.empId,
        transferDate: {
          [Op.and]: [
            { [Op.gte]: dayjs(month).startOf('month').toDate() },
            { [Op.lte]: dayjs(month).endOf('month').toDate() }
          ]
        }
      },
      order: [['transferDate', 'ASC']]
    });

    if (transfers.length === 0) {
      // 无调岗，全部计入当前组织
      return {
        allocatedCost: cost.appliedCostStandard,
        splitRatio: 1.00,
        finalCost: cost.appliedCostStandard,
        allocations: [{
          orgId: employee.orgId,
          ratio: 1.00,
          amount: cost.appliedCostStandard,
          type: 'current_org'
        }]
      };
    }

    // 有调岗，按工作日比例拆分
    const daysInMonth = dayjs(month).daysInMonth();
    const beforeTransfer = dayjs(transfers[0].transferDate).date() - 1;
    const afterTransfer = daysInMonth - beforeTransfer;

    const beforeAmount = cost.appliedCostStandard * (beforeTransfer / daysInMonth);
    const afterAmount = cost.appliedCostStandard * (afterTransfer / daysInMonth);

    return {
      allocatedCost: cost.appliedCostStandard,
      splitRatio: 1.00,
      finalCost: cost.appliedCostStandard,
      allocations: [
        {
          orgId: transfers[0].originalOrg,
          ratio: beforeTransfer / daysInMonth,
          amount: beforeAmount,
          type: 'before_transfer'
        },
        {
          orgId: transfers[0].targetOrg,
          ratio: afterTransfer / daysInMonth,
          amount: afterAmount,
          type: 'after_transfer'
        }
      ]
    };
  }

  // 更新团队月度账户
  async updateTeamAccount(splitResult, month) {
    for (const alloc of splitResult.allocations) {
      const account = await TeamAccount.findOne({
        where: { orgId: alloc.orgId, belongMonth: month }
      });

      if (account) {
        await account.update({
          monthlyCostConsumption: account.monthlyCostConsumption + alloc.amount,
          closingBalance: account.closingBalance - alloc.amount
        });
      }
    }
  }

  // 确认提交
  async confirm(req, res) {
    try {
      const { ids } = req.body;
      
      // 获取要确认的成本记录
      const costs = await MonthlyCost.findAll({
        where: { recordId: { [Op.in]: ids } },
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['empId', 'name', 'orgId'],
          include: [{
            model: OrgStructure,
            as: 'organization',
            attributes: ['orgId', 'orgName']
          }]
        }]
      });

      await MonthlyCost.update(
        { status: '已确认' },
        { where: { recordId: { [Op.in]: ids } } }
      );

      // 按组织分组通知
      const orgMap = {};
      for (const cost of costs) {
        const orgId = cost.employee?.orgId;
        if (orgId) {
          if (!orgMap[orgId]) orgMap[orgId] = { count: 0, orgName: cost.employee?.organization?.orgName };
          orgMap[orgId].count++;
        }
      }

      // 通知各团队负责人
      for (const [orgId, data] of Object.entries(orgMap)) {
        const org = await OrgStructure.findByPk(orgId);
        if (org?.leaderId) {
          await notificationService.send({
            userId: org.leaderId,
            type: 'system',
            title: '月度成本已确认',
            content: `团队 ${data.orgName} 有 ${data.count} 条成本记录已确认，计入本月账户`,
            relatedType: 'monthly_cost',
            relatedId: costs[0]?.recordId
          });
        }
      }

      res.json(success(null, '确认成功'));
    } catch (err) {
      res.status(500).json(error(500, '确认失败', err.message));
    }
  }
}

module.exports = new MonthlyCostController();
