/**
 * 定时任务: 公积金自动划转
 * 每月5日凌晨 2:30 执行（等待回款数据稳定）
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每月5日 02:30 执行
const PROVIDENT_FUND_CRON = '30 2 5 * *';

let isRunning = false;

async function runProvidentFundTransfer() {
  if (isRunning) {
    console.log('[公积金划转任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[公积金划转任务] 开始执行: ${new Date().toISOString()}`);

  try {
    // 处理上个月的数据
    const targetMonth = new Date();
    targetMonth.setMonth(targetMonth.getMonth() - 1);
    const monthStr = targetMonth.toISOString().slice(0, 7) + '-01';
    
    const result = await dataFactoryService.autoTransferProvidentFund(monthStr);
    console.log('[公积金划转任务] 执行成功:', result);
  } catch (error) {
    console.error('[公积金划转任务] 执行失败:', error);
  } finally {
    isRunning = false;
    console.log(`[公积金划转任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startProvidentFundJob() {
  console.log('[公积金划转任务] 定时任务已启动:', PROVIDENT_FUND_CRON);
  
  cron.schedule(PROVIDENT_FUND_CRON, runProvidentFundTransfer, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopProvidentFundJob() {
  console.log('[公积金划转任务] 定时任务已停止');
}

// 手动触发
async function manualRun(targetMonth = null) {
  console.log('[公积金划转任务] 手动触发执行');
  return await dataFactoryService.autoTransferProvidentFund(targetMonth);
}

module.exports = {
  startProvidentFundJob,
  stopProvidentFundJob,
  manualRun,
  runProvidentFundTransfer
};
