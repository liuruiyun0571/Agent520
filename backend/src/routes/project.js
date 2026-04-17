const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { auth, checkRole } = require('../middleware/auth');
const { body } = require('express-validator');

router.use(auth);

router.get('/list', projectController.getList);
router.get('/:id', projectController.getById);
router.post('/', [
  body('projectName').notEmpty(),
  body('contractAmount').isDecimal(),
  body('customerName').notEmpty(),
  body('signDate').isDate()
], checkRole('系统管理员', '部门管理员', '项目经理'), projectController.create);
router.put('/:id', checkRole('系统管理员', '部门管理员', '项目经理'), projectController.update);
router.delete('/:id', checkRole('系统管理员'), projectController.delete);
router.post('/:id/allocate', checkRole('系统管理员', '部门管理员'), projectController.allocateTeams);

module.exports = router;
