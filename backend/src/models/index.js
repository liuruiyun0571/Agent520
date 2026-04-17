const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite 数据库文件路径
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/data.sqlite');

// 创建 Sequelize 实例 - 使用 SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 导入所有模型
const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Employee = require('./Employee');
const Project = require('./Project');
const ProjectTeam = require('./ProjectTeam');
const ProjectEmp = require('./ProjectEmp');
const Payment = require('./Payment');
const OrgStructure = require('./OrgStructure');
const MonthlyCost = require('./MonthlyCost');
const TeamAccount = require('./TeamAccount');
const EmpHistory = require('./EmpHistory');
const Notification = require('./Notification');
const OperationLog = require('./OperationLog');
const GlobalConfig = require('./GlobalConfig');
const BonusAllocationDetail = require('./BonusAllocationDetail');

// 定义关联关系
// User - Role 多对多
User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId' });

// Project - ProjectTeam
Project.hasMany(ProjectTeam, { foreignKey: 'projectId', as: 'teams' });
ProjectTeam.belongsTo(Project, { foreignKey: 'projectId' });

// Project - Payment
Project.hasMany(Payment, { foreignKey: 'projectId', as: 'payments' });
Payment.belongsTo(Project, { foreignKey: 'projectId' });

// Employee - Payment
Employee.hasMany(Payment, { foreignKey: 'employeeId', as: 'payments' });
Payment.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// TeamAccount - Payment
TeamAccount.hasMany(Payment, { foreignKey: 'teamAccountId', as: 'payments' });
Payment.belongsTo(TeamAccount, { foreignKey: 'teamAccountId', as: 'teamAccount' });

// 同步数据库
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('[数据库] 所有模型同步完成');
  } catch (error) {
    console.error('[数据库] 同步失败:', error);
    throw error;
  }
};

// 测试连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('[数据库] SQLite 连接成功');
    console.log('[数据库] 数据文件:', dbPath);
  } catch (error) {
    console.error('[数据库] 连接失败:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  User,
  Role,
  UserRole,
  Employee,
  Project,
  ProjectTeam,
  ProjectEmp,
  Payment,
  OrgStructure,
  MonthlyCost,
  TeamAccount,
  EmpHistory,
  Notification,
  OperationLog,
  GlobalConfig,
  BonusAllocationDetail
};
