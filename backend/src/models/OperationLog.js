/**
 * 操作日志模型 - 用于审计
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class OperationLog extends Model {}

OperationLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作模块，如: project, payment, cost'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作类型，如: create, update, delete, approve'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '操作描述'
  },
  requestMethod: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'request_method'
  },
  requestUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'request_url'
  },
  requestParams: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'request_params'
  },
  responseData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'response_data'
  },
  ipAddress: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'user_agent'
  },
  executionTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'execution_time',
    comment: '执行时间(ms)'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'success',
    comment: '操作状态: success, failed'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  }
}, {
  sequelize,
  modelName: 'OperationLog',
  tableName: 'operation_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = OperationLog;
