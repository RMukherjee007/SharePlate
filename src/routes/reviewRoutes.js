const express = require('express');
const router = express.Router();
const { getReviews, createReview } = require('../controllers/reviewController');
const { reviewLimiter } = require('../middleware/rateLimiter');

router.get('/', getReviews);
router.post('/', reviewLimiter, createReview);

module.exports = router;
