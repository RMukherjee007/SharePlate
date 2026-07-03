const pool = require('../config/db');

// Config
const TOTAL_RECORDS = 1200;
const DAYS_BACK = 30;
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'];
const BATCH_TYPES = ['Produce', 'Baked_Goods', 'Prepared_Meals', 'Dry_Goods', 'Dairy'];

const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomWeight = () => (Math.random() * 45 + 5).toFixed(1); // 5kg to 50kg

async function simulateDonations() {
  console.log(`Starting Data Simulation: Generating ${TOTAL_RECORDS} records over the last ${DAYS_BACK} days...`);

  try {
    // 1. Ensure we have at least one restaurant (donor_id) and one charity (charity_id)
    await pool.execute(`INSERT IGNORE INTO Users (user_id, role, name, address, base_city, latitude, longitude) VALUES 
      (998, 'Restaurant', 'Simulated Donor', '123 Fake St', 'New York', 40.7, -74.0),
      (999, 'Charity', 'Simulated Charity', '456 Fake Ave', 'New York', 40.7, -74.0)
    `);

    let batchesValues = [];
    let claimsValues = [];

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - DAYS_BACK);

    for (let i = 0; i < TOTAL_RECORDS; i++) {
      const city = randomElement(CITIES);
      const batchType = randomElement(BATCH_TYPES);
      const weight = randomWeight();
      const createdAt = randomDate(startDate, now);
      
      const expiryDate = new Date(createdAt);
      expiryDate.setHours(expiryDate.getHours() + Math.floor(Math.random() * 48) + 12); // 12 to 60 hours validity

      // 80% chance it was claimed
      const isClaimed = Math.random() < 0.8;
      const status = isClaimed ? 'claimed' : (expiryDate < now ? 'expired' : 'available');

      batchesValues.push([
        998,
        `Simulated ${batchType} in ${city}`,
        batchType,
        weight,
        expiryDate.toISOString().slice(0, 19).replace('T', ' '),
        status,
        city,
        'Simulated Donor',
        '123 Fake St, ' + city,
        createdAt.toISOString().slice(0, 19).replace('T', ' ')
      ]);
    }

    // Insert batches in chunks to avoid max query size errors
    const chunkSize = 200;
    console.log('Inserting batches...');
    
    for (let i = 0; i < batchesValues.length; i += chunkSize) {
      const chunk = batchesValues.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      
      // Flatten chunk but skip the created_at we drafted before, as we aren't sure it exists
      const flatValues = chunk.map(b => [b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8]]).flat();
      
      await pool.execute(`
        INSERT INTO Food_Batches (donor_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, donor_name, pickup_address) 
        VALUES ${placeholders}
      `, flatValues);
    }

    console.log(`✅ Simulation Complete! Inserted ${TOTAL_RECORDS} dummy food batches.`);
  } catch (err) {
    console.error('Simulation Error:', err);
  } finally {
    process.exit(0);
  }
}

simulateDonations();
