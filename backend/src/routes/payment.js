const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth, checkRole } = require('../middleware/auth');
const { body } = require('express-validator');

router.use(auth);

router.get('/list', paymentController.getList);
router.post('/', [
  body('projectId').notEmpty(),
  body('paymentAmount').isDecimal(),
  body('paymentDate').isDate(),
  body('correspondingNode').isInt()
], paymentController.create);
router.post('/:id/approve', checkRole('系统管理员', '部门管理员', '团队负责人'), paymentController.approve);

module.exports = router;
