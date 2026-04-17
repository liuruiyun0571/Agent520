/**
 * 通知消息路由
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/rbac');

// 获取通知列表
router.get('/list', authenticate, notificationController.getList);

// 获取未读通知数量
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// 标记通知为已读
router.post('/:notifyId/read', authenticate, notificationController.markAsRead);

// 标记所有通知为已读
router.post('/read-all', authenticate, notificationController.markAllAsRead);

// 删除通知
router.delete('/:notifyId', authenticate, notificationController.delete);

module.exports = router;
