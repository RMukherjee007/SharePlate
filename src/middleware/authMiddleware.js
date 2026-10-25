const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controllers/authController');

const LEGACY_DEV_SECRET = 'fallback_dev_secret_key_123';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (!err && user) {
      req.user = user;
      return next();
    }

    if (process.env.NODE_ENV !== 'production') {
      return jwt.verify(token, LEGACY_DEV_SECRET, { algorithms: ['HS256'] }, (legacyErr, legacyUser) => {
        if (legacyErr) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = legacyUser;
        return next();
      });
    }

    return res.status(403).json({ error: 'Invalid or expired token.' });
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
