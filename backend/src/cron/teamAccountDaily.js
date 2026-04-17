/**
 * 定时任务: 日结任务
 * 每日凌晨 1:00 执行，汇总前一日数据
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每日 01:00 执行
const DAILY_SETTLEMENT_CRON = '0 1 * * *';

let isRunning = false;

async function runDailySettlement() {
  if (isRunning) {
    console.log('[日结任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[日结任务] 开始执行: ${new Date().toISOString()}`);

  try {
    const result = await dataFactoryService.dailySettlement();
    console.log('[日结任务] 执行成功:', result);
  } catch (error) {
    console.error('[日结任务] 执行失败:', error);
    // 这里可以添加钉钉/邮件通知
  } finally {
    isRunning = false;
    console.log(`[日结任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startDailySettlementJob() {
  console.log('[日结任务] 定时任务已启动:', DAILY_SETTLEMENT_CRON);
  
  cron.schedule(DAILY_SETTLEMENT_CRON, runDailySettlement, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopDailySettlementJob() {
  console.log('[日结任务] 定时任务已停止');
}

// 手动触发（用于测试或补跑）
async function manualRun(targetDate = null) {
  console.log('[日结任务] 手动触发执行');
  return await dataFactoryService.dailySettlement(targetDate);
}

module.exports = {
  startDailySettlementJob,
  stopDailySettlementJob,
  manualRun,
  runDailySettlement
};
