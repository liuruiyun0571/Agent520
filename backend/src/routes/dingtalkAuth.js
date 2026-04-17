const express = require('express');
const router = express.Router();
const dingTalkAuthController = require('../controllers/dingTalkAuthController');
const { auth } = require('../middleware/auth');

// 公开路由
router.get('/js-config', dingTalkAuthController.getJsConfig);
router.post('/login-by-code', dingTalkAuthController.loginByCode);

// 需要认证的路由
router.post('/bind', auth, dingTalkAuthController.bindDingTalk);

module.exports = router;
