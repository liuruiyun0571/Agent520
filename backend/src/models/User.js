const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_hash'
  },
  empId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'emp_id'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '普通用户'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  },
  // 钉钉登录相关字段
  dingUserId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'ding_user_id'
  },
  dingUnionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'ding_union_id'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
