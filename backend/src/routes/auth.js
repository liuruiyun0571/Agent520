const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginValidation, registerValidation } = require('../middleware/validation');
const { auth, checkRole } = require('../middleware/auth');

// 公开路由
router.post('/login', loginValidation, authController.login);

// 需要认证的路由
router.get('/me', auth, authController.me);
router.post('/change-password', auth, authController.changePassword);

// 仅管理员
router.post('/register', auth, checkRole('系统管理员'), registerValidation, authController.register);

module.exports = router;
