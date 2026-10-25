const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticateToken, getMe);

module.exports = router;
