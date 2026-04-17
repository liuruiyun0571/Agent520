/**
 * 数据库初始化脚本
 * 自动创建表结构和默认数据
 */

const { sequelize, syncDatabase } = require('../src/models');
const bcrypt = require('bcryptjs');
const { User, Role, GlobalConfig } = require('../src/models');

async function initDatabase() {
  try {
    console.log('[初始化] 开始初始化数据库...');
    
    // 同步所有模型（创建表）
    await syncDatabase(false);
    console.log('[初始化] 数据表创建完成');
    
    // 检查是否已有管理员账号
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      // 创建默认管理员
      const passwordHash = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        passwordHash,
        role: '系统管理员',
        name: '管理员',
        isActive: true
      });
      console.log('[初始化] 默认管理员账号创建完成');
      console.log('[初始化] 用户名: admin, 密码: admin123');
    } else {
      console.log('[初始化] 管理员账号已存在');
    }
    
    // 创建默认角色
    const defaultRoles = [
      { roleCode: 'admin', roleName: '系统管理员', permissions: ['*'], dataScope: 'all' },
      { roleCode: 'leader', roleName: '院领导', permissions: ['dashboard', 'reports'], dataScope: 'all' },
      { roleCode: 'manager', roleName: '团队经理', permissions: ['team', 'projects', 'payments'], dataScope: 'team' },
      { roleCode: 'user', roleName: '普通用户', permissions: ['view'], dataScope: 'self' }
    ];
    
    for (const role of defaultRoles) {
      await Role.findOrCreate({
        where: { roleCode: role.roleCode },
        defaults: role
      });
    }
    console.log('[初始化] 默认角色创建完成');
    
    // 创建全局配置
    const configExists = await GlobalConfig.findOne();
    if (!configExists) {
      await GlobalConfig.create({
        managementCostRate: 0.15,
        awardCoefficient: 0.75,
        overdraftWarningLine: 50,
        overdraftFreezeLine: 80,
        providentFundRate: 0.20,
        protectionPeriodMonths: 2
      });
      console.log('[初始化] 全局配置创建完成');
    }
    
    console.log('[初始化] 数据库初始化完成！');
    return true;
  } catch (error) {
    console.error('[初始化] 失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initDatabase };
