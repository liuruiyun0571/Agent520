/**
 * 通知消息模型
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class Notification extends Model {}

Notification.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  notifyId: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    field: 'notify_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '通知类型: approval(审批), system(系统), warning(预警)'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  relatedType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'related_type',
    comment: '关联业务类型: payment, cost, project'
  },
  relatedId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'related_id',
    comment: '关联业务ID'
  },
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'action_url',
    comment: '点击跳转链接'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  sendChannel: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'send_channel',
    comment: '发送渠道: app, dingtalk, sms, email'
  },
  sendStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    field: 'send_status',
    comment: '发送状态: pending, sent, failed'
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Notification;
