/**
 * 定时任务调度中心
 * 统一管理所有数据工厂定时任务
 */

const monthlyAccountJob = require('./monthlyAccountJob');
const teamAccountDaily = require('./teamAccountDaily');
const overdraftCheckJob = require('./overdraftCheckJob');
const providentFundJob = require('./providentFundJob');
const protectionCheckJob = require('./protectionCheckJob');
const monthlySettlementJob = require('./monthlySettlementJob');

let isInitialized = false;

/**
 * 启动所有定时任务
 */
function startAllJobs() {
  if (isInitialized) {
    console.log('[任务调度中心] 任务已在运行中');
    return;
  }

  console.log('========================================');
  console.log('[任务调度中心] 启动数据工厂定时任务...');
  console.log('========================================');

  // 1. 日结任务 - 每日 01:00
  teamAccountDaily.startDailySettlementJob();

  // 2. 月度账户创建 - 每月1日 02:00
  monthlyAccountJob.startMonthlyAccountJob();

  // 3. 超支检测 - 每日 03:00
  overdraftCheckJob.startOverdraftCheckJob();

  // 4. 月度结算 - 每月1日 04:00
  monthlySettlementJob.startMonthlySettlementJob();

  // 5. 公积金划转 - 每月5日 02:30
  providentFundJob.startProvidentFundJob();

  // 6. 保护期检查 - 每周一 04:00
  protectionCheckJob.startProtectionCheckJob();

  isInitialized = true;

  console.log('========================================');
  console.log('[任务调度中心] 所有任务已启动');
  console.log('========================================');
}

/**
 * 停止所有定时任务
 */
function stopAllJobs() {
  console.log('[任务调度中心] 停止所有定时任务...');
  
  monthlyAccountJob.stopMonthlyAccountJob();
  teamAccountDaily.stopDailySettlementJob();
  overdraftCheckJob.stopOverdraftCheckJob();
  providentFundJob.stopProvidentFundJob();
  protectionCheckJob.stopProtectionCheckJob();
  monthlySettlementJob.stopMonthlySettlementJob();

  isInitialized = false;
  console.log('[任务调度中心] 所有任务已停止');
}

/**
 * 手动触发指定任务
 */
async function manualRun(jobName, params = null) {
  console.log(`[任务调度中心] 手动触发任务: ${jobName}`);
  
  switch (jobName) {
    case 'monthlyAccount':
      return await monthlyAccountJob.manualRun(params);
    case 'dailySettlement':
      return await teamAccountDaily.manualRun(params);
    case 'overdraftCheck':
      return await overdraftCheckJob.manualRun();
    case 'providentFund':
      return await providentFundJob.manualRun(params);
    case 'protectionCheck':
      return await protectionCheckJob.manualRun();
    case 'monthlySettlement':
      return await monthlySettlementJob.manualRun(params);
    default:
      throw new Error(`未知任务: ${jobName}`);
  }
}

/**
 * 获取任务状态
 */
function getStatus() {
  return {
    isRunning: isInitialized,
    jobs: [
      { name: '日结任务', cron: '0 1 * * *', desc: '每日汇总回款和成本' },
      { name: '月度账户创建', cron: '0 2 1 * *', desc: '每月1日创建新账户' },
      { name: '超支检测', cron: '0 3 * * *', desc: '每日检测超支并冻结' },
      { name: '月度结算', cron: '0 4 1 * *', desc: '每月1日月末结算' },
      { name: '公积金划转', cron: '30 2 5 * *', desc: '每月5日划转公积金' },
      { name: '保护期检查', cron: '0 4 * * 1', desc: '每周一检查保护期' }
    ]
  };
}

module.exports = {
  startAllJobs,
  stopAllJobs,
  manualRun,
  getStatus
};
