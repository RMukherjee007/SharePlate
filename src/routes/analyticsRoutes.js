const express = require('express');
const router = express.Router();
const { getForecastAndEfficiency, getGlobalStats } = require('../controllers/analyticsController');

// In a real app, this would be protected by admin middleware
router.get('/forecast', getForecastAndEfficiency);
router.get('/global-stats', getGlobalStats);

module.exports = router;
