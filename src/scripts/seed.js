const pool = require('../config/db');

async function seedDatabase() {
  console.log('Starting Database Seeding...');

  try {
    // Check if users already exist (idempotent seed)
    const [existing] = await pool.execute('SELECT COUNT(*) as count FROM Users');
    if (existing[0].count > 0) {
      console.log('Database already seeded. Skipping.');
      return;
    }

    // 1. Insert Users with explicit IDs for demo: ID 1 = Restaurant, ID 3 = Charity
    console.log('Inserting Users...');
    await pool.execute(`
      INSERT INTO Users (user_id, role, name, address, base_city, latitude, longitude) VALUES
      (1, 'Restaurant', 'Green Apple Bistro', '123 Apple St, New York, NY', 'New York', 40.730610, -73.935242),
      (2, 'Restaurant', 'The Daily Loaf', '456 Bread Blvd, New York, NY', 'New York', 40.748817, -73.985428),
      (3, 'Charity', 'Hope Food Bank', '789 Charity Ln, New York, NY', 'New York', 40.730000, -73.950000)
    `);

    // 2. Insert Dietary Tags
    console.log('Inserting Dietary Tags...');
    await pool.execute(`
      INSERT IGNORE INTO Dietary_Tags (name) VALUES
      ('Vegan'), ('Gluten-Free'), ('Halal'), ('Dairy-Free')
    `);

    // 3. Insert Food Batches
    console.log('Inserting Food Batches...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const expiryStr = futureDate.toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(`
      INSERT INTO Food_Batches (donor_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, donor_name, pickup_address) VALUES
      (1, 'Assorted artisan bread and pastries', 'Baked_Goods', 15.5, ?, 'available', 'New York', 'Green Apple Bistro', '123 Apple St, New York, NY'),
      (2, 'Organic salads and fruit bowls', 'Produce', 8.0, ?, 'available', 'New York', 'The Daily Loaf', '456 Bread Blvd, New York, NY'),
      (1, 'Canned soups and vegetables', 'Dry_Goods', 20.0, ?, 'available', 'New York', 'Green Apple Bistro', '123 Apple St, New York, NY')
    `, [expiryStr, expiryStr, expiryStr]);

    // 4. Link Batches with Tags
    console.log('Linking Tags to Batches...');
    const [batches] = await pool.execute("SELECT batch_id FROM Food_Batches ORDER BY batch_id");
    const [tags] = await pool.execute("SELECT tag_id, name FROM Dietary_Tags");

    const veganTag = tags.find(t => t.name === 'Vegan').tag_id;
    const glutenFreeTag = tags.find(t => t.name === 'Gluten-Free').tag_id;

    await pool.execute(`
      INSERT INTO Batch_Tags (batch_id, tag_id) VALUES
      (?, ?),
      (?, ?),
      (?, ?)
    `, [batches[0].batch_id, veganTag, batches[1].batch_id, veganTag, batches[1].batch_id, glutenFreeTag]);

    console.log('✅ Seeding Complete! Demo data is ready. Login with ID 1 (Restaurant) or ID 3 (Charity).');
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
