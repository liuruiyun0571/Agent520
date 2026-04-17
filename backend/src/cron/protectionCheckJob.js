/**
 * 定时任务: 保护期检查
 * 每周一凌晨 4:00 执行
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每周一 04:00 执行
const PROTECTION_CHECK_CRON = '0 4 * * 1';

let isRunning = false;

async function runProtectionCheck() {
  if (isRunning) {
    console.log('[保护期检查任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[保护期检查任务] 开始执行: ${new Date().toISOString()}`);

  try {
    const result = await dataFactoryService.checkProtectionPeriod();
    console.log('[保护期检查任务] 执行成功:', result);
    
    if (result.length > 0) {
      console.warn('[保护期检查任务] 新进入保护期团队:', result);
      // TODO: 发送通知
    }
  } catch (error) {
    console.error('[保护期检查任务] 执行失败:', error);
  } finally {
    isRunning = false;
    console.log(`[保护期检查任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startProtectionCheckJob() {
  console.log('[保护期检查任务] 定时任务已启动:', PROTECTION_CHECK_CRON);
  
  cron.schedule(PROTECTION_CHECK_CRON, runProtectionCheck, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopProtectionCheckJob() {
  console.log('[保护期检查任务] 定时任务已停止');
}

// 手动触发
async function manualRun() {
  console.log('[保护期检查任务] 手动触发执行');
  return await dataFactoryService.checkProtectionPeriod();
}

module.exports = {
  startProtectionCheckJob,
  stopProtectionCheckJob,
  manualRun,
  runProtectionCheck
};
