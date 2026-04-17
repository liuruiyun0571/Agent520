const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { auth, checkRole } = require('../middleware/auth');

router.use(auth);

router.get('/', configController.get);
router.put('/', checkRole('系统管理员', '部门管理员'), configController.update);

module.exports = router;
