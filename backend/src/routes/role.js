/**
 * 角色管理路由
 */

const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate, authorize } = require('../middleware/rbac');

// 获取角色列表
router.get('/list', authenticate, roleController.getList);

// 获取所有权限列表
router.get('/permissions', authenticate, roleController.getAllPermissions);

// 获取角色详情
router.get('/:id', authenticate, roleController.getById);

// 创建角色（需要系统管理权限）
router.post('/', authenticate, authorize('admin'), roleController.create);

// 更新角色
router.put('/:id', authenticate, authorize('admin'), roleController.update);

// 删除角色
router.delete('/:id', authenticate, authorize('admin'), roleController.delete);

// 分配角色给用户
router.post('/assign', authenticate, authorize('admin'), roleController.assignToUser);

module.exports = router;
