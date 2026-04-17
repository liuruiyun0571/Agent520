/**
 * 定时任务: 月度结算
 * 每月1日凌晨 4:00 执行（在所有其他任务之后）
 */

const cron = require('node-cron');
const dataFactoryService = require('../services/dataFactoryService');

// 每月1日 04:00 执行
const MONTHLY_SETTLEMENT_CRON = '0 4 1 * *';

let isRunning = false;

async function runMonthlySettlement() {
  if (isRunning) {
    console.log('[月度结算任务] 任务正在运行中，跳过本次执行');
    return;
  }

  isRunning = true;
  console.log(`[月度结算任务] 开始执行: ${new Date().toISOString()}`);

  try {
    // 处理上个月的数据
    const targetMonth = new Date();
    targetMonth.setMonth(targetMonth.getMonth() - 1);
    const monthStr = targetMonth.toISOString().slice(0, 7) + '-01';
    
    const result = await dataFactoryService.monthlySettlement(monthStr);
    console.log('[月度结算任务] 执行成功:', result);
  } catch (error) {
    console.error('[月度结算任务] 执行失败:', error);
  } finally {
    isRunning = false;
    console.log(`[月度结算任务] 执行结束: ${new Date().toISOString()}`);
  }
}

// 启动定时任务
function startMonthlySettlementJob() {
  console.log('[月度结算任务] 定时任务已启动:', MONTHLY_SETTLEMENT_CRON);
  
  cron.schedule(MONTHLY_SETTLEMENT_CRON, runMonthlySettlement, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
}

// 立即停止定时任务
function stopMonthlySettlementJob() {
  console.log('[月度结算任务] 定时任务已停止');
}

// 手动触发
async function manualRun(targetMonth = null) {
  console.log('[月度结算任务] 手动触发执行');
  return await dataFactoryService.monthlySettlement(targetMonth);
}

module.exports = {
  startMonthlySettlementJob,
  stopMonthlySettlementJob,
  manualRun,
  runMonthlySettlement
};
