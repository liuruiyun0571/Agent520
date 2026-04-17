/**
 * 通知控制器
 */

const notificationService = require('../services/notificationService');

const notificationController = {
  // 获取用户的通知列表
  async getList(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit, isRead, type } = req.query;
      
      const result = await notificationService.getUserNotifications(userId, {
        page,
        limit,
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
        type
      });
      
      res.json({
        code: 200,
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取通知列表失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取通知列表失败'
      });
    }
  },

  // 标记通知为已读
  async markAsRead(req, res) {
    try {
      const { notifyId } = req.params;
      const userId = req.user.id;
      
      const result = await notificationService.markAsRead(notifyId, userId);
      
      res.json({
        code: 200,
        success: result.success,
        message: result.success ? '标记成功' : result.message
      });
    } catch (error) {
      console.error('标记通知失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '标记通知失败'
      });
    }
  },

  // 标记所有通知为已读
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      await notificationService.markAllAsRead(userId);
      
      res.json({
        code: 200,
        success: true,
        message: '已全部标记为已读'
      });
    } catch (error) {
      console.error('标记通知失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '标记通知失败'
      });
    }
  },

  // 删除通知
  async delete(req, res) {
    try {
      const { notifyId } = req.params;
      const userId = req.user.id;
      
      await notificationService.deleteNotification(notifyId, userId);
      
      res.json({
        code: 200,
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除通知失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '删除通知失败'
      });
    }
  },

  // 获取未读通知数量
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const { Notification } = require('../models');
      const count = await Notification.count({
        where: { userId, isRead: false }
      });
      
      res.json({
        code: 200,
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('获取未读数量失败:', error);
      res.status(500).json({
        code: 500,
        success: false,
        message: '获取未读数量失败'
      });
    }
  }
};

module.exports = notificationController;
