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

module.exports = sequelize;
module.exports.testConnection = testConnection;
