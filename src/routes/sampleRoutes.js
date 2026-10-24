const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/sampleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/dashboard/:user_id', authenticateToken, getDashboardData);

module.exports = router;
