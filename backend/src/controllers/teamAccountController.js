/**
 * 团队账户控制器
 */

const { TeamAccount, OrgStructure, sequelize } = require('../models');
const { Op } = require('sequelize');

const teamAccountController = {
  // 获取团队账户列表
  async getList(req, res) {
    try {
      const { belongMonth, orgId, page = 1, limit = 50 } = req.query;
      
      const where = {};
      if (belongMonth) where.belongMonth = belongMonth;
      if (orgId) where.orgId = orgId;
      
      const { count, rows } = await TeamAccount.findAndCountAll({
        where,
        include: [{
          model: OrgStructure,
          attributes: ['orgName', 'orgType', 'currentStatus', 'providentFundBalance']
        }],
        order: [['belongMonth', 'DESC'], ['orgId', 'ASC']],
        offset: (page - 1) * limit,
        limit: parseInt(limit)
      });
      
      res.json({
        code: 200,
        success: true,
        data: {
          list: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取团队账户列表失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取团队账户列表失败'
      });
    }
  },

  // 获取单个账户详情
  async getDetail(req, res) {
    try {
      const { orgId, month } = req.query;
      
      const account = await TeamAccount.findOne({
        where: { orgId, belongMonth: month },
        include: [{
          model: OrgStructure,
          attributes: ['orgName', 'orgType', 'currentStatus', 'providentFundBalance']
        }]
      });
      
      if (!account) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: '账户不存在'
        });
      }
      
      res.json({
        code: 200,
        success: true,
        data: account
      });
    } catch (error) {
      console.error('获取账户详情失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取账户详情失败'
      });
    }
  },

  // 获取账户历史趋势
  async getHistory(req, res) {
    try {
      const { orgId, months = 6 } = req.query;
      
      // 获取最近N个月的数据
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months + 1);
      
      const accounts = await TeamAccount.findAll({
        where: {
          orgId,
          belongMonth: {
            [Op.between]: [
              startDate.toISOString().slice(0, 7) + '-01',
              endDate.toISOString().slice(0, 7) + '-01'
            ]
          }
        },
        order: [['belongMonth', 'ASC']]
      });
      
      res.json({
        code: 200,
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('获取账户历史失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取账户历史失败'
      });
    }
  }
};

module.exports = teamAccountController;
