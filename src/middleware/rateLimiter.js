const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window (accommodates 5s dashboard polling)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too many requests from this IP, please try again after 15 minutes',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Strict limit for login/registration brute-force protection
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Prevent unauthenticated review spam
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many review submissions from this IP, please try again later'
  }
});

module.exports = { globalLimiter, authLimiter, reviewLimiter };
