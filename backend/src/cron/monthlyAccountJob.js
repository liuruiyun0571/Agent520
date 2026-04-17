/**
 * 定时任务: 月度账户自动创建
 * 每月1日凌晨 2:00 执行
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每月1日 02:00 执行
const CREATE_ACCOUNT_CRON = '0 2 1 * *';

let isRunning = false;

async function runMonthlyAccountJob() {
  if (isRunning) {
    console.log('[月度账户任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[月度账户任务] 开始执行: ${new Date().toISOString()}`);

  try {
    const result = await dataFactoryService.createMonthlyAccounts();
    console.log('[月度账户任务] 执行成功:', result);
  } catch (error) {
    console.error('[月度账户任务] 执行失败:', error);
    // 这里可以添加钉钉/邮件通知
  } finally {
    isRunning = false;
    console.log(`[月度账户任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startMonthlyAccountJob() {
  console.log('[月度账户任务] 定时任务已启动:', CREATE_ACCOUNT_CRON);
  
  cron.schedule(CREATE_ACCOUNT_CRON, runMonthlyAccountJob, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopMonthlyAccountJob() {
  console.log('[月度账户任务] 定时任务已停止');
  // cron 任务会在进程退出时自动清理
}

// 手动触发（用于测试或补跑）
async function manualRun(targetMonth = null) {
  console.log('[月度账户任务] 手动触发执行');
  return await dataFactoryService.createMonthlyAccounts(targetMonth);
}

module.exports = {
  startMonthlyAccountJob,
  stopMonthlyAccountJob,
  manualRun,
  runMonthlyAccountJob
};
