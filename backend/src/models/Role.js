/**
 * 角色模型 - RBAC权限体系
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class Role extends Model {}

Role.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roleCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'role_code',
    comment: '角色编码，如: admin, team_manager, finance'
  },
  roleName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'role_name',
    comment: '角色名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '角色描述'
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '权限列表，如: ["project:create", "payment:approve"]'
  },
  dataScope: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'personal',
    field: 'data_scope',
    comment: '数据权限范围: all(全部), dept(部门), team(团队), personal(个人)'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
    comment: '是否系统内置角色'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  }
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Role;
