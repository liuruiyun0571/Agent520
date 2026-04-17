const express = require('express');
const router = express.Router();
const monthlyCostController = require('../controllers/monthlyCostController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/list', monthlyCostController.getList);
router.post('/import', monthlyCostController.importExcel);
router.post('/calculate', monthlyCostController.calculateSplit);
router.post('/confirm', monthlyCostController.confirm);

module.exports = router;
