/**
 * 用户角色关联模型
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class UserRole extends Model {}

UserRole.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'role_id',
    references: {
      model: 'roles',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'UserRole',
  tableName: 'user_roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['user_id', 'role_id'] }
  ]
});

module.exports = UserRole;
