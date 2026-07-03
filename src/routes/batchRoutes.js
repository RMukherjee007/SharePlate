const express = require('express');
const router = express.Router();
const { getAvailableBatchesNearby, getMyBatches, createBatch } = require('../controllers/batchController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/nearby', getAvailableBatchesNearby);
router.get('/me', authenticateToken, requireRole(['Restaurant']), getMyBatches);
router.post('/', authenticateToken, requireRole(['Restaurant']), createBatch);

module.exports = router;
