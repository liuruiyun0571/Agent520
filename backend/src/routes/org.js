const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { auth, checkRole } = require('../middleware/auth');
const { orgValidation } = require('../middleware/validation');
const upload = require('../middleware/upload');

// 所有路由需要认证
router.use(auth);

// 查询路由
router.get('/tree', orgController.getTree);
router.get('/list', orgController.getList);
router.get('/:id', orgController.getById);

// 修改路由 (需要管理员权限)
router.post('/', checkRole('系统管理员', '部门管理员'), orgValidation, orgController.create);
router.put('/:id', checkRole('系统管理员', '部门管理员'), orgValidation, orgController.update);
router.delete('/:id', checkRole('系统管理员'), orgController.delete);

// Excel导入
router.post('/import', checkRole('系统管理员', '部门管理员'), upload.single('file'), orgController.importExcel);

module.exports = router;
