const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { auth, checkRole } = require('../middleware/auth');
const { employeeValidation } = require('../middleware/validation');
const upload = require('../middleware/upload');

router.use(auth);

router.get('/list', employeeController.getList);
router.get('/:id', employeeController.getById);
router.post('/', checkRole('系统管理员', '部门管理员'), employeeValidation, employeeController.create);
router.put('/:id', checkRole('系统管理员', '部门管理员'), employeeController.update);
router.delete('/:id', checkRole('系统管理员'), employeeController.delete);
router.post('/import', checkRole('系统管理员', '部门管理员'), upload.single('file'), employeeController.importExcel);

module.exports = router;
