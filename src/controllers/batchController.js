const pool = require('../config/db');
const { redisClient } = require('../config/redis');

/**
 * Finds all 'available' Food_Batches for a specific city.
 * Uses exact string matching and dynamic Redis caching.
 */
const getAvailableBatchesNearby = async (req, res) => {
  const { city } = req.query;

  const cacheKey = city ? `batches:${city.trim().toLowerCase()}` : 'batches:all';

  try {
    // Check Cache first
    const cachedBatches = await redisClient.get(cacheKey);
    if (cachedBatches) {
      console.log(`Serving batches from Redis Cache`);
      return res.status(200).json(JSON.parse(cachedBatches));
    }

    console.log(`Cache miss. Fetching from MySQL...`);
    
    let query;
    let queryParams = [];
    
    if (city && city.trim() !== '') {
      query = `
        SELECT 
          fb.batch_id, 
          fb.description, 
          fb.batch_type, 
          fb.weight_kg, 
          fb.expiry_timestamp,
          fb.delivery_city,
          fb.donor_name,
          fb.pickup_address AS address
        FROM Food_Batches fb
        WHERE fb.status = 'available' AND LOWER(fb.delivery_city) = ?
        ORDER BY fb.batch_id DESC;
      `;
      queryParams = [city.trim().toLowerCase()];
    } else {
      query = `
        SELECT 
          fb.batch_id, 
          fb.description, 
          fb.batch_type, 
          fb.weight_kg, 
          fb.expiry_timestamp,
          fb.delivery_city,
          fb.donor_name,
          fb.pickup_address AS address
        FROM Food_Batches fb
        WHERE fb.status = 'available'
        ORDER BY fb.batch_id DESC;
      `;
    }

    const [rows] = await pool.execute(query, queryParams);

    const resultData = {
      count: rows.length,
      batches: rows
    };

    // Set Cache with 1-hour TTL (3600 seconds)
    await redisClient.set(cacheKey, JSON.stringify(resultData), { EX: 3600 });

    res.status(200).json(resultData);
  } catch (error) {
    console.error('City Search Error:', error);
    res.status(500).json({ error: 'Internal server error during city search' });
  }
};

/**
 * Fetch all batches created by the logged-in restaurant (donor)
 */
const getMyBatches = async (req, res) => {
  const donor_id = req.user.user_id;

  try {
    const query = `
      SELECT batch_id, description, batch_type, weight_kg, expiry_timestamp, status
      FROM Food_Batches
      WHERE donor_id = ?
      ORDER BY batch_id DESC
    `;
    const [batches] = await pool.execute(query, [donor_id]);
    
    res.status(200).json({
      batches
    });
  } catch (error) {
    console.error('Error fetching my batches:', error);
    res.status(500).json({ error: 'Failed to fetch your batches' });
  }
};

/**
 * Create a new food batch (for Restaurants)
 */
const createBatch = async (req, res) => {
  const donor_id = req.user.user_id;
  const { description, batch_type, weight_kg, expiry_hours, delivery_city, donor_name, pickup_address } = req.body;

  if (!description || !batch_type || !weight_kg || !expiry_hours || !delivery_city || !donor_name || !pickup_address) {
    return res.status(400).json({ error: 'Missing required fields including donor_name and pickup_address' });
  }

  try {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + parseInt(expiry_hours, 10));
    const expiryStr = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        'INSERT INTO Food_Batches (donor_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, donor_name, pickup_address) VALUES (?, ?, ?, ?, ?, \'available\', ?, ?, ?)',
        [donor_id, description, batch_type, weight_kg, expiryStr, delivery_city.trim(), donor_name.trim(), pickup_address.trim()]
      );

      await connection.commit();
      
      // Cache Invalidation: Delete both specific city and 'all' caches
      const cacheKey = `batches:${delivery_city.trim().toLowerCase()}`;
      await redisClient.del(cacheKey);
      await redisClient.del('batches:all');
      console.log(`Successfully invalidated Redis cache for ${cacheKey} and batches:all`);

      // Publish event to Redis Pub/Sub
      await redisClient.publish('inventory_updates', JSON.stringify({
        type: 'NEW_BATCH',
        city: delivery_city.trim(),
        batch_id: result.insertId,
        description,
        weight_kg
      }));

      res.status(201).json({
        message: 'Food batch posted successfully!',
        batch_id: result.insertId
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create food batch' });
  }
};

module.exports = { getAvailableBatchesNearby, getMyBatches, createBatch };
