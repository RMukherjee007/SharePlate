const { createBatch } = require('./src/controllers/batchController');
const pool = require('./src/config/db');

async function test() {
  const req = {
    user: { user_id: 1 },
    body: {
      description: 'Test',
      batch_type: 'Dry_Goods',
      weight_kg: '10',
      expiry_hours: '24',
      delivery_city: 'New York',
      donor_name: 'Test Donor',
      pickup_address: '123 Main St'
    }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log('Response:', code, data)
    })
  };
  await createBatch(req, res);
  pool.end();
  process.exit();
}
test();
