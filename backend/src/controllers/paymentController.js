const { validationResult } = require('express-validator');
const { Payment, Project, ProjectTeam, OrgStructure, TeamAccount, BonusAllocationDetail, User } = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

class PaymentController {
  // 获取列表
  async getList(req, res) {
    try {
      const { page = 1, limit = 20, projectId, status } = req.query;
      const where = {};
      
      if (projectId) where.projectId = projectId;
      if (status) where.processStatus = status;

      const { count, rows } = await Payment.findAndCountAll({
        where,
        include: [{
          model: Project,
          attributes: ['projectId', 'projectName', 'estimatedGrossMargin']
        }],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['paymentDate', 'DESC']]
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
      res.status(500).json(error(500, '获取回款列表失败', err.message));
    }
  }

  // 创建回款记录
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(error(400, '参数校验失败', errors.array()));
      }

      const { projectId, paymentAmount } = req.body;

      // 生成paymentId
      const lastPayment = await Payment.findOne({ order: [['paymentId', 'DESC']] });
      const lastNum = lastPayment ? parseInt(lastPayment.paymentId.slice(2)) : 0;
      const newId = `HK${String(lastNum + 1).padStart(6, '0')}`;

      const payment = await Payment.create({
        ...req.body,
        paymentId: newId,
        creatorId: req.user.userId,
        processStatus: '审批中'
      });

      // 发送通知给有审批权限的用户
      await this.notifyApprovers(payment, req.user);

      res.status(201).json(success(payment, '创建成功，等待审批'));
    } catch (err) {
      res.status(500).json(error(500, '创建回款失败', err.message));
    }
  }

  // 通知审批人
  async notifyApprovers(payment, creator) {
    try {
      // 查找有 payment:approve 权限的用户
      const { Role, UserRole } = require('../models');
      const roles = await Role.findAll({
        where: {
          permissions: { [Op.contains]: ['payment:approve'] }
        }
      });

      const roleIds = roles.map(r => r.id);
      if (roleIds.length === 0) return;

      const userRoles = await UserRole.findAll({
        where: { roleId: { [Op.in]: roleIds } }
      });

      const userIds = [...new Set(userRoles.map(ur => ur.userId))];
      
      // 过滤掉创建者自己
      const approverIds = userIds.filter(id => id !== creator.id);

      if (approverIds.length > 0) {
        await notificationService.sendApprovalNotifications({
          type: 'payment',
          recordId: payment.paymentId,
          applicantId: creator.id,
          approverIds,
          amount: payment.paymentAmount,
          title: `${payment.paymentPhase} - ¥${payment.paymentAmount.toLocaleString()}`
        });
      }
    } catch (err) {
      console.error('通知审批人失败:', err);
    }
  }

  // 审批回款
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { action, comment } = req.body; // 'approve' 或 'reject'

      const payment = await Payment.findOne({
        where: { paymentId: id },
        include: [{ model: Project }]
      });

      if (!payment) {
        return res.status(404).json(error(404, '回款记录不存在'));
      }

      if (payment.processStatus !== '审批中') {
        return res.status(400).json(error(400, '该记录已审批'));
      }

      if (action === 'approve') {
        // 通过审批，自动分配奖金
        await payment.update({
          processStatus: '已通过',
          approverId: req.user.userId,
          approvedAt: new Date(),
          approvalComment: comment
        });

        // 触发奖金分配
        await this.allocateBonus(payment);

        // 通知申请人审批通过
        await notificationService.send({
          userId: payment.creatorId,
          type: 'system',
          title: '回款审批已通过',
          content: `您的回款申请 ${payment.paymentId} 已通过审批，奖金已分配到各团队账户`,
          relatedType: 'payment',
          relatedId: payment.paymentId
        });

        res.json(success(null, '审批通过，奖金已分配'));
      } else {
        await payment.update({
          processStatus: '已驳回',
          approverId: req.user.userId,
          approvedAt: new Date(),
          approvalComment: comment
        });

        // 通知申请人审批驳回
        await notificationService.send({
          userId: payment.creatorId,
          type: 'system',
          title: '回款审批被驳回',
          content: `您的回款申请 ${payment.paymentId} 已被驳回${comment ? '，原因：' + comment : ''}`,
          relatedType: 'payment',
          relatedId: payment.paymentId
        });

        res.json(success(null, '已驳回'));
      }
    } catch (err) {
      res.status(500).json(error(500, '审批失败', err.message));
    }
  }

  // 奖金分配逻辑
  async allocateBonus(payment) {
    const transaction = await require('../models').sequelize.transaction();
    
    try {
      const { projectId, paymentAmount, paymentDate } = payment;
      const project = await Project.findOne({ where: { projectId } });
      
      // 查询项目团队分配
      const allocations = await ProjectTeam.findAll({
        where: {
          projectId,
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gte]: paymentDate } }
          ]
        },
        include: [{ model: OrgStructure, as: 'organization' }]
      });

      let totalAllocatable = 0;
      const allocationDetails = [];

      for (const alloc of allocations) {
        const org = alloc.organization;
        
        // 计算奖金: 回款金额 × 毛利率 × (1-管理成本率) × 计奖系数 × 分配比例
        const allocatableBonus = paymentAmount 
          * (project.estimatedGrossMargin / 100)
          * (1 - org.managementCostRate)
          * org.awardCoefficient
          * (alloc.allocationRatio / 100);

        totalAllocatable += allocatableBonus;
        allocationDetails.push({
          orgId: alloc.orgId,
          amount: allocatableBonus,
          basis: `回款金额${paymentAmount}×毛利率${project.estimatedGrossMargin}%×(1-管理成本率${org.managementCostRate})×计奖系数${org.awardCoefficient}×分配比例${alloc.allocationRatio}%`
        });

        // 更新团队月度账户
        const month = dayjs(paymentDate).format('YYYY-MM-01');
        let account = await TeamAccount.findOne({
          where: { orgId: alloc.orgId, belongMonth: month }
        });

        if (!account) {
          // 创建新账户记录
          const lastMonth = dayjs(month).subtract(1, 'month').format('YYYY-MM-01');
          const lastAccount = await TeamAccount.findOne({
            where: { orgId: alloc.orgId, belongMonth: lastMonth }
          });
          
          account = await TeamAccount.create({
            accountId: `TA${alloc.orgId}${dayjs(month).format('YYYYMM')}`,
            orgId: alloc.orgId,
            belongMonth: month,
            openingBalance: lastAccount ? lastAccount.closingBalance : org.startFundAmount
          });
        }

        await account.update({
          monthlyReceivedBonus: account.monthlyReceivedBonus + allocatableBonus,
          closingBalance: account.openingBalance + account.monthlyReceivedBonus + allocatableBonus - account.monthlyCostConsumption
        });

        // 插入奖金分配明细
        await BonusAllocationDetail.create({
          detailId: `BAD${Date.now()}${alloc.id}`,
          paymentId: payment.paymentId,
          orgId: alloc.orgId,
          allocationAmount: allocatableBonus,
          calculationBasis: allocationDetails.find(d => d.orgId === alloc.orgId).basis
        });
      }

      // 更新回款记录
      await payment.update({
        bonusCalcStatus: '已计算',
        allocatableBonus: totalAllocatable
      });

      // 更新项目累计回款
      await project.update({
        totalReceived: project.totalReceived + parseFloat(paymentAmount),
        remainingReceivable: project.contractAmount - (project.totalReceived + parseFloat(paymentAmount))
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      console.error('奖金分配失败:', err);
      throw err;
    }
  }
}

module.exports = new PaymentController();
