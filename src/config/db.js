const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'food_waste_redistribution_platform',
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Explicitly test the connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL Database!');
    connection.release();
  } catch (error) {
    console.error('Failed to connect to MySQL Database:', error.message);
  }
})();

module.exports = pool;
