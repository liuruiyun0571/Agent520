/**
 * 测试环境初始化
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'cloud_engineering_test';

// 模拟 console 方法以减少测试输出
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

// 全局测试超时
jest.setTimeout(10000);

// 在所有测试后清理
afterAll(async () => {
  // 关闭数据库连接等
  const { sequelize } = require('../src/models');
  if (sequelize) {
    await sequelize.close();
  }
});
