const express = require('express');
const router = express.Router();
const { getForecastAndEfficiency } = require('../controllers/analyticsController');

// In a real app, this would be protected by admin middleware
router.get('/forecast', getForecastAndEfficiency);

module.exports = router;
