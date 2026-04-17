/**
 * 操作日志路由
 */

const express = require('express');
const router = express.Router();
const operationLogController = require('../controllers/operationLogController');
const { authenticate, authorize } = require('../middleware/rbac');

// 获取操作日志列表（需要管理员权限）
router.get('/list', authenticate, authorize('admin'), operationLogController.getList);

// 获取模块列表
router.get('/modules', authenticate, operationLogController.getModules);

// 获取操作类型列表
router.get('/actions', authenticate, operationLogController.getActions);

module.exports = router;
