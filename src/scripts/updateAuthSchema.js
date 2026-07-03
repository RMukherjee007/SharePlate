const pool = require('../config/db');

async function updateAuthSchema() {
  console.log('Starting Schema Update for Authentication...');

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Update existing 'Charity' roles to 'NGO' to match the new strict ENUM requirements
    console.log('Migrating existing roles...');
    await connection.execute(`UPDATE Users SET role = 'NGO' WHERE role = 'Charity'`);

    // 2. Modify the role column to be a strict ENUM
    console.log('Enforcing ENUM on role column...');
    await connection.execute(`
      ALTER TABLE Users 
      MODIFY COLUMN role ENUM('NGO', 'Restaurant') NOT NULL
    `);

    // 3. Check if email column exists, add if missing
    const [emailColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'email'
    `);

    if (emailColumns.length === 0) {
      console.log('Adding email and password_hash columns...');
      // Adding with DEFAULT to prevent errors on existing rows, then removing default later or just allowing NULL for old ones
      await connection.execute(`
        ALTER TABLE Users 
        ADD COLUMN email VARCHAR(255) UNIQUE,
        ADD COLUMN password_hash VARCHAR(255)
      `);
      
      // Update existing test users with dummy emails and passwords so they don't break
      // Password hash for 'password123'
      const dummyHash = '$2a$10$tZ2E2HjSjH4F.C8Wq1W5M.0M1LgL5O1Y/B.J9f/p2o0k2T7dG.nGi';
      await connection.execute(`UPDATE Users SET email = CONCAT('user', user_id, '@example.com'), password_hash = ? WHERE email IS NULL`, [dummyHash]);
      
      // Enforce NOT NULL now that old records are filled
      await connection.execute(`
        ALTER TABLE Users 
        MODIFY COLUMN email VARCHAR(255) NOT NULL,
        MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
      `);
    } else {
      console.log('Email column already exists. Skipping column addition.');
    }

    await connection.commit();
    console.log('✅ Schema Update Complete! Authentication schema is ready.');

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Schema Update Error:', error.message);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

updateAuthSchema();
