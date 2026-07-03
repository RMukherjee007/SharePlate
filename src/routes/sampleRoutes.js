const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/sampleController');

router.get('/dashboard/:user_id', getDashboardData);

module.exports = router;
