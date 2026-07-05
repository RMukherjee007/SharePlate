const pool = require('../config/db');

async function addIndexes() {
  try {
    console.log('Connecting to database...');
    
    // Add index on status for faster filtering
    try {
      console.log('Adding index on status...');
      await pool.execute('ALTER TABLE Food_Batches ADD INDEX idx_status (status)');
      console.log('✅ Index idx_status added successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_status already exists.');
      } else {
        throw err;
      }
    }

    // Add index on delivery_city for faster geographic searching
    try {
      console.log('Adding index on delivery_city...');
      await pool.execute('ALTER TABLE Food_Batches ADD INDEX idx_delivery_city (delivery_city)');
      console.log('✅ Index idx_delivery_city added successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_delivery_city already exists.');
      } else {
        throw err;
      }
    }

    console.log('All indexes verified/added. Database optimization complete.');
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    process.exit(0);
  }
}

addIndexes();
