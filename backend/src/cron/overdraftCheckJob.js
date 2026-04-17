/**
 * 定时任务: 超支检测与冻结
 * 每日凌晨 3:00 执行
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每日 03:00 执行
const OVERDRAFT_CHECK_CRON = '0 3 * * *';

let isRunning = false;

async function runOverdraftCheck() {
  if (isRunning) {
    console.log('[超支检测任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[超支检测任务] 开始执行: ${new Date().toISOString()}`);

  try {
    const result = await dataFactoryService.checkOverdraftAndFreeze();
    console.log('[超支检测任务] 执行成功:', result);
    
    // 如果有冻结或预警，发送通知
    if (result.frozen.length > 0 || result.warnings.length > 0) {
      console.warn('[超支检测任务] 发现异常团队:', {
        冻结: result.frozen,
        预警: result.warnings
      });
      // TODO: 发送钉钉/邮件通知
    }
  } catch (error) {
    console.error('[超支检测任务] 执行失败:', error);
  } finally {
    isRunning = false;
    console.log(`[超支检测任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startOverdraftCheckJob() {
  console.log('[超支检测任务] 定时任务已启动:', OVERDRAFT_CHECK_CRON);
  
  cron.schedule(OVERDRAFT_CHECK_CRON, runOverdraftCheck, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopOverdraftCheckJob() {
  console.log('[超支检测任务] 定时任务已停止');
}

// 手动触发
async function manualRun() {
  console.log('[超支检测任务] 手动触发执行');
  return await dataFactoryService.checkOverdraftAndFreeze();
}

module.exports = {
  startOverdraftCheckJob,
  stopOverdraftCheckJob,
  manualRun,
  runOverdraftCheck
};
