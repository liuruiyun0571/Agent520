const express = require('express');
const router = express.Router();
const projectEmpController = require('../controllers/projectEmpController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/list', projectEmpController.getList);
router.post('/', projectEmpController.create);
router.put('/:id', projectEmpController.update);
router.delete('/:id', projectEmpController.delete);

module.exports = router;
