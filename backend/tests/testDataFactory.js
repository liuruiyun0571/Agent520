/**
 * 数据工厂测试脚本
 * 用于验证 Phase 4 核心功能
 */

const dataFactoryService = require('../src/services/dataFactoryService');

// 测试月度账户创建
async function testCreateMonthlyAccounts() {
  console.log('\n========== 测试: 创建月度账户 ==========');
  try {
    const result = await dataFactoryService.createMonthlyAccounts('2024-04-01');
    console.log('✅ 创建成功:', result);
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
  }
}

// 测试超支检测
async function testOverdraftCheck() {
  console.log('\n========== 测试: 超支检测 ==========');
  try {
    const result = await dataFactoryService.checkOverdraftAndFreeze();
    console.log('✅ 检测完成:', result);
  } catch (error) {
    console.error('❌ 检测失败:', error.message);
  }
}

// 测试公积金划转
async function testProvidentFundTransfer() {
  console.log('\n========== 测试: 公积金划转 ==========');
  try {
    const result = await dataFactoryService.autoTransferProvidentFund('2024-04-01');
    console.log('✅ 划转完成:', result);
  } catch (error) {
    console.error('❌ 划转失败:', error.message);
  }
}

// 测试保护期检查
async function testProtectionCheck() {
  console.log('\n========== 测试: 保护期检查 ==========');
  try {
    const result = await dataFactoryService.checkProtectionPeriod();
    console.log('✅ 检查完成:', result);
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

// 测试月度结算
async function testMonthlySettlement() {
  console.log('\n========== 测试: 月度结算 ==========');
  try {
    const result = await dataFactoryService.monthlySettlement('2024-04-01');
    console.log('✅ 结算完成:', result);
  } catch (error) {
    console.error('❌ 结算失败:', error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('========================================');
  console.log('   数据工厂 Phase 4 功能测试');
  console.log('========================================');
  
  await testCreateMonthlyAccounts();
  await testOverdraftCheck();
  await testProvidentFundTransfer();
  await testProtectionCheck();
  await testMonthlySettlement();
  
  console.log('\n========================================');
  console.log('   所有测试执行完毕');
  console.log('========================================\n');
  process.exit(0);
}

// 根据命令行参数运行指定测试
const testName = process.argv[2];

if (testName === 'create') {
  testCreateMonthlyAccounts().then(() => process.exit(0));
} else if (testName === 'overdraft') {
  testOverdraftCheck().then(() => process.exit(0));
} else if (testName === 'fund') {
  testProvidentFundTransfer().then(() => process.exit(0));
} else if (testName === 'protection') {
  testProtectionCheck().then(() => process.exit(0));
} else if (testName === 'settlement') {
  testMonthlySettlement().then(() => process.exit(0));
} else {
  runAllTests();
}
