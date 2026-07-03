const pool = require('../config/db');

async function addVerificationSchema() {
  console.log('Starting Schema Update for NGO Verification...');

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if is_verified column exists, add if missing
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'is_verified'
    `);

    if (columns.length === 0) {
      console.log('Adding is_verified column...');
      await connection.execute(`
        ALTER TABLE Users 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
      `);
      
      // Update existing test users to be verified so they don't break
      console.log('Setting existing users to verified...');
      await connection.execute(`UPDATE Users SET is_verified = TRUE`);
    } else {
      console.log('is_verified column already exists. Skipping column addition.');
    }

    await connection.commit();
    console.log('✅ Schema Update Complete! NGO Verification schema is ready.');

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Schema Update Error:', error.message);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

addVerificationSchema();
