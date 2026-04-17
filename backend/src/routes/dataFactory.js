/**
 * 数据工厂 API 路由
 * 提供手动触发任务和查看任务状态的接口
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const cronJobs = require('../cron');
const dataFactoryService = require('../services/dataFactoryService');

/**
 * GET /api/data-factory/status
 * 获取定时任务状态
 */
router.get('/status', authenticate, (req, res) => {
  const status = cronJobs.getStatus();
  res.json({
    code: 200,
    data: status
  });
});

/**
 * POST /api/data-factory/jobs/:jobName/run
 * 手动触发指定任务
 * 仅管理员可操作
 */
router.post('/jobs/:jobName/run', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { jobName } = req.params;
    const { params } = req.body || {};
    
    console.log(`[API] 手动触发任务: ${jobName}`, params);
    
    const result = await cronJobs.manualRun(jobName, params);
    
    res.json({
      code: 200,
      message: `任务 ${jobName} 执行成功`,
      data: result
    });
  } catch (error) {
    console.error('[API] 手动触发任务失败:', error);
    res.status(500).json({
      code: 500,
      message: `任务执行失败: ${error.message}`
    });
  }
});

/**
 * POST /api/data-factory/monthly-accounts/create
 * 创建月度账户
 */
router.post('/monthly-accounts/create', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { month } = req.body || {};
    
    const result = await dataFactoryService.createMonthlyAccounts(month);
    
    res.json({
      code: 200,
      message: '月度账户创建成功',
      data: result
    });
  } catch (error) {
    console.error('[API] 创建月度账户失败:', error);
    res.status(500).json({
      code: 500,
      message: `创建失败: ${error.message}`
    });
  }
});

/**
 * POST /api/data-factory/overdraft-check
 * 执行超支检测
 */
router.post('/overdraft-check', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await dataFactoryService.checkOverdraftAndFreeze();
    
    res.json({
      code: 200,
      message: '超支检测完成',
      data: result
    });
  } catch (error) {
    console.error('[API] 超支检测失败:', error);
    res.status(500).json({
      code: 500,
      message: `检测失败: ${error.message}`
    });
  }
});

/**
 * POST /api/data-factory/provident-fund/transfer
 * 公积金自动划转
 */
router.post('/provident-fund/transfer', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { month } = req.body || {};
    
    const result = await dataFactoryService.autoTransferProvidentFund(month);
    
    res.json({
      code: 200,
      message: '公积金划转完成',
      data: result
    });
  } catch (error) {
    console.error('[API] 公积金划转失败:', error);
    res.status(500).json({
      code: 500,
      message: `划转失败: ${error.message}`
    });
  }
});

/**
 * POST /api/data-factory/monthly-settlement
 * 执行月度结算
 */
router.post('/monthly-settlement', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { month } = req.body || {};
    
    const result = await dataFactoryService.monthlySettlement(month);
    
    res.json({
      code: 200,
      message: '月度结算完成',
      data: result
    });
  } catch (error) {
    console.error('[API] 月度结算失败:', error);
    res.status(500).json({
      code: 500,
      message: `结算失败: ${error.message}`
    });
  }
});

module.exports = router;
