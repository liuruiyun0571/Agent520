/**
 * 团队账户路由
 */

const express = require('express');
const router = express.Router();
const teamAccountController = require('../controllers/teamAccountController');
const { authenticate } = require('../middleware/auth');

// 获取账户列表
router.get('/list', authenticate, teamAccountController.getList);

// 获取账户详情
router.get('/detail', authenticate, teamAccountController.getDetail);

// 获取历史趋势
router.get('/history', authenticate, teamAccountController.getHistory);

module.exports = router;
