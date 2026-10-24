const pool = require('../config/db');
const { redisClient } = require('../config/redis');

/**
 * Demonstrates Redis lazy loading and parallelized data fetching with Promise.all().
 */
const getDashboardData = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Prevent IDOR: only allow users to view their own dashboard (unless Admin)
  if (!req.user || (String(req.user.user_id) !== String(user_id) && req.user.role !== 'Admin')) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const cacheKey = `user_dashboard:${user_id}`;

  try {
    // 1. Redis Lazy Loading: Check cache first
    let cachedData = null;
    try {
      cachedData = await redisClient.get(cacheKey);
    } catch (redisErr) {
      console.warn('Redis GET error, falling back to MySQL:', redisErr.message);
    }

    if (cachedData) {
      console.log('Serving from Redis cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log('Cache miss. Fetching from MySQL...');

    // 2. Concurrency: Use Promise.all() to parallelize independent DB requests
    const [userResult, claimsResult] = await Promise.all([
      pool.execute('SELECT name, role, address FROM Users WHERE user_id = ?', [user_id]),
      pool.execute('SELECT * FROM Claims WHERE charity_id = ? ORDER BY claimed_at DESC LIMIT 5', [user_id])
    ]);

    const userData = userResult[0][0];
    const recentClaims = claimsResult[0];

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dashboardData = {
      user: userData,
      recent_claims: recentClaims,
      timestamp: new Date().toISOString()
    };

    // 3. Set Cache with 1-hour TTL (3600 seconds)
    try {
      await redisClient.set(cacheKey, JSON.stringify(dashboardData), {
        EX: 3600
      });
    } catch (redisErr) {
      console.warn('Redis SET error, ignoring:', redisErr.message);
    }

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getDashboardData };
