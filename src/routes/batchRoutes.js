const express = require('express');
const router = express.Router();
const { getAvailableBatchesNearby, getMyBatches, createBatch, optimizeRouteHandler, analyzeFoodHandler } = require('../controllers/batchController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/nearby', getAvailableBatchesNearby);
router.post('/optimize-route', authenticateToken, requireRole(['NGO', 'Charity']), optimizeRouteHandler);
router.post('/analyze-food', authenticateToken, requireRole(['Restaurant']), analyzeFoodHandler);
router.get('/me', authenticateToken, requireRole(['Restaurant']), getMyBatches);
router.post('/', authenticateToken, requireRole(['Restaurant']), createBatch);

module.exports = router;
