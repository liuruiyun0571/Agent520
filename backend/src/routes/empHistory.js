const express = require('express');
const router = express.Router();
const empHistoryController = require('../controllers/empHistoryController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/list', empHistoryController.getList);
router.post('/', empHistoryController.create);
router.put('/:id/share-ratio', empHistoryController.updateShareRatio);

module.exports = router;
