const express = require('express');
const router = express.Router();
const { getSystemOverview, verifyNGO } = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Protect admin routes
router.use(authenticateToken);
router.use(requireRole(['Admin']));

router.get('/overview', getSystemOverview);
router.put('/verify-ngo/:id', verifyNGO);

module.exports = router;
