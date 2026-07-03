const express = require('express');
const router = express.Router();
const { requestBatch, getPendingRequests, acceptClaim, getMyClaims } = require('../controllers/claimController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.post('/request', authenticateToken, requireRole(['Charity']), requestBatch);
router.post('/accept', authenticateToken, requireRole(['Restaurant']), acceptClaim);
router.get('/pending', authenticateToken, requireRole(['Restaurant']), getPendingRequests);
router.get('/my-claims', authenticateToken, requireRole(['Charity']), getMyClaims);

module.exports = router;
