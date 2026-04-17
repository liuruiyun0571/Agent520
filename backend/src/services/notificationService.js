/**
 * 通知服务
 * 统一管理应用内通知和钉钉通知
 */

const { v4: uuidv4 } = require('uuid');
const { Notification, User } = require('../models');
const dingtalk = require('../utils/dingtalk');

class NotificationService {
  /**
   * 创建并发送通知
   * @param {object} params 通知参数
   */
  async send({
    userId,
    type,
    title,
    content,
    relatedType,
    relatedId,
    actionUrl,
    channels = ['app'], // app, dingtalk
    dingtalkOptions = {}
  }) {
    try {
      // 1. 创建应用内通知
      const notifyId = `NOT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const notification = await Notification.create({
        notifyId,
        userId,
        type,
        title,
        content,
        relatedType,
        relatedId,
        actionUrl,
        sendChannel: channels.join(','),
        sendStatus: 'pending'
      });

      // 2. 发送钉钉通知（如果需要）
      if (channels.includes('dingtalk')) {
        const user = await User.findByPk(userId);
        
        if (type === 'approval') {
          await dingtalk.sendApprovalNotification({
            type: relatedType,
            title,
            applicant: dingtalkOptions.applicant || user?.username,
            amount: dingtalkOptions.amount || 0,
            date: dingtalkOptions.date || new Date().toISOString().slice(0, 10),
            actionUrl,
            approvers: dingtalkOptions.approvers
          });
        } else if (type === 'warning') {
          await dingtalk.sendWarningNotification({
            type: dingtalkOptions.warningType || 'overdraft',
            teamName: dingtalkOptions.teamName,
            ratio: dingtalkOptions.ratio,
            balance: dingtalkOptions.balance,
            month: dingtalkOptions.month
          });
        } else {
          await dingtalk.sendSystemNotification(title, content);
        }
      }

      // 更新发送状态
      await notification.update({ sendStatus: 'sent' });

      return { success: true, notifyId };
    } catch (error) {
      console.error('发送通知失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量发送通知
   */
  async sendBulk(userIds, notificationData) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.send({ ...notificationData, userId });
      results.push({ userId, ...result });
    }
    return results;
  }

  /**
   * 获取用户的通知列表
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, isRead, type } = options;
    
    const where = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    return {
      list: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      },
      unreadCount: await Notification.count({
        where: { userId, isRead: false }
      })
    };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notifyId, userId) {
    const notification = await Notification.findOne({
      where: { notifyId, userId }
    });

    if (!notification) {
      return { success: false, message: '通知不存在' };
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    return { success: true };
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId) {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );

    return { success: true };
  }

  /**
   * 删除通知
   */
  async deleteNotification(notifyId, userId) {
    await Notification.destroy({
      where: { notifyId, userId }
    });

    return { success: true };
  }

  /**
   * 发送审批通知给相关人员
   */
  async sendApprovalNotifications(approvalData) {
    const { type, recordId, applicantId, approverIds, amount, title } = approvalData;
    
    // 通知审批人
    for (const approverId of approverIds) {
      await this.send({
        userId: approverId,
        type: 'approval',
        title: `待审批: ${title}`,
        content: `您有一条待审批的${type === 'payment' ? '回款' : '成本'}记录，金额: ¥${amount}`,
        relatedType: type,
        relatedId: recordId,
        actionUrl: `/approval/${type}/${recordId}`,
        channels: ['app', 'dingtalk'],
        dingtalkOptions: { amount, title }
      });
    }

    // 通知申请人
    await this.send({
      userId: applicantId,
      type: 'system',
      title: '申请已提交',
      content: `您的${type === 'payment' ? '回款' : '成本'}申请已提交，等待审批`,
      relatedType: type,
      relatedId: recordId
    });
  }

  /**
   * 发送超支预警
   */
  async sendOverdraftWarning(teamData) {
    const { orgId, orgName, cumulativeOverdraftRatio, closingBalance, belongMonth } = teamData;
    
    // 获取团队负责人
    const { OrgStructure, Employee } = require('../models');
    const team = await OrgStructure.findByPk(orgId);
    
    if (team?.leaderId) {
      await this.send({
        userId: team.leaderId,
        type: 'warning',
        title: '团队资金预警',
        content: `您的团队 ${orgName} 透支比例已达到 ${cumulativeOverdraftRatio}%`,
        relatedType: 'team_account',
        relatedId: orgId,
        channels: ['app', 'dingtalk'],
        dingtalkOptions: {
          warningType: cumulativeOverdraftRatio >= 80 ? 'freeze' : 'overdraft',
          teamName: orgName,
          ratio: cumulativeOverdraftRatio,
          balance: closingBalance,
          month: belongMonth
        }
      });
    }
  }
}

module.exports = new NotificationService();
