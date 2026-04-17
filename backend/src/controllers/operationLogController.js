/**
 * 操作日志控制器
 */

const { OperationLog } = require('../models');
const { Op } = require('sequelize');

const operationLogController = {
  // 获取操作日志列表
  async getList(req, res) {
    try {
      const { 
        keyword, 
        module, 
        action, 
        status,
        startDate,
        endDate,
        page = 1, 
        limit = 20 
      } = req.query;
      
      const where = {};
      
      if (keyword) {
        where[Op.or] = [
          { username: { [Op.iLike]: `%${keyword}%` } },
          { description: { [Op.iLike]: `%${keyword}%` } }
        ];
      }
      
      if (module) where.module = module;
      if (action) where.action = action;
      if (status) where.status = status;
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate + ' 23:59:59');
      }
      
      const { count, rows } = await OperationLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
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
      console.error('获取操作日志失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取操作日志失败'
      });
    }
  },

  // 获取模块列表（用于筛选）
  async getModules(req, res) {
    try {
      const modules = await OperationLog.findAll({
        attributes: ['module'],
        group: ['module'],
        raw: true
      });
      
      res.json({
        code: 200,
        success: true,
        data: modules.map(m => m.module)
      });
    } catch (error) {
      console.error('获取模块列表失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取模块列表失败'
      });
    }
  },

  // 获取操作类型列表（用于筛选）
  async getActions(req, res) {
    try {
      const actions = await OperationLog.findAll({
        attributes: ['action'],
        group: ['action'],
        raw: true
      });
      
      res.json({
        code: 200,
        success: true,
        data: actions.map(a => a.action)
      });
    } catch (error) {
      console.error('获取操作类型失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取操作类型失败'
      });
    }
  }
};

module.exports = operationLogController;
