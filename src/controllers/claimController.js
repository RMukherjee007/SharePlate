const pool = require('../config/db');
const { redisClient } = require('../config/redis');

/**
 * Step 1: Charity requests a food batch.
 * Creates a pending claim and locks the batch.
 */
const requestBatch = async (req, res) => {
  const { batch_id, charity_name, charity_address } = req.body;
  const charity_id = req.user.user_id;

  if (!batch_id || !charity_name || !charity_address) {
    return res.status(400).json({ error: 'batch_id, charity_name, and charity_address are required' });
  }

  // Block unverified NGOs
  if (req.user.role === 'NGO' && !req.user.is_verified) {
    return res.status(403).json({ error: 'Your account is pending verification. You cannot claim food batches until an admin approves your organization.' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Check if the batch is still 'available' and lock the row
      const [batches] = await connection.execute(
        'SELECT status, delivery_city FROM Food_Batches WHERE batch_id = ? FOR UPDATE',
        [batch_id]
      );

      if (batches.length === 0) {
        throw new Error('Food batch not found');
      }

      if (batches[0].status !== 'available') {
        throw new Error('This batch is no longer available for requests');
      }

      // 2. Set batch status to 'locked'
      await connection.execute(
        'UPDATE Food_Batches SET status = "locked" WHERE batch_id = ?',
        [batch_id]
      );

      // 3. Create a pending claim
      const [insertResult] = await connection.execute(
        'INSERT INTO Claims (batch_id, charity_id, pickup_status, charity_name, charity_address) VALUES (?, ?, "pending", ?, ?)',
        [batch_id, charity_id, charity_name.trim(), charity_address.trim()]
      );

      await connection.commit();

      // Invalidate Cache so it disappears from 'available' immediately
      const delivery_city = batches[0].delivery_city;
      const cacheKey = `batches:${delivery_city.trim().toLowerCase()}`;
      await redisClient.del(cacheKey);
      await redisClient.del('batches:all');

      // Publish event to Redis Pub/Sub
      await redisClient.publish('inventory_updates', JSON.stringify({
        type: 'BATCH_REQUESTED',
        city: delivery_city.trim(),
        batch_id
      }));

      res.status(201).json({
        message: 'Request sent successfully. Pending restaurant approval.',
        claim_id: insertResult.insertId
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Request Error:', error);
    res.status(500).json({ error: error.message || 'Failed to request food batch' });
  }
};

/**
 * Fetch pending claims for a Restaurant
 */
const getPendingRequests = async (req, res) => {
  const donor_id = req.user.user_id;
  try {
    const query = `
      SELECT c.claim_id, c.batch_id, c.charity_id, c.claimed_at, fb.description, fb.weight_kg, c.charity_name, c.charity_address
      FROM Claims c
      JOIN Food_Batches fb ON c.batch_id = fb.batch_id
      WHERE fb.donor_id = ? AND c.pickup_status = 'pending'
      ORDER BY c.claimed_at ASC
    `;
    const [requests] = await pool.execute(query, [donor_id]);
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

/**
 * Step 2: Restaurant accepts the request.
 * Sets claim to completed, batch to claimed.
 */
const acceptClaim = async (req, res) => {
  const { claim_id } = req.body;
  const donor_id = req.user.user_id;

  if (!claim_id) return res.status(400).json({ error: 'claim_id is required' });

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verify the claim belongs to a batch owned by this donor and is pending
      const [claims] = await connection.execute(
        `SELECT c.batch_id, c.charity_id, fb.delivery_city FROM Claims c 
         JOIN Food_Batches fb ON c.batch_id = fb.batch_id 
         WHERE c.claim_id = ? AND fb.donor_id = ? AND c.pickup_status = 'pending' FOR UPDATE`,
        [claim_id, donor_id]
      );

      if (claims.length === 0) {
        throw new Error('Valid pending request not found');
      }

      const batch_id = claims[0].batch_id;

      // Update Claim to completed
      await connection.execute(
        'UPDATE Claims SET pickup_status = "completed" WHERE claim_id = ?',
        [claim_id]
      );

      // Update Food_Batch to claimed
      await connection.execute(
        'UPDATE Food_Batches SET status = "claimed" WHERE batch_id = ?',
        [batch_id]
      );

      await connection.commit();

      // Invalidate the cache for this city and all batches
      const delivery_city = claims[0].delivery_city;
      const cacheKey = `batches:${delivery_city.trim().toLowerCase()}`;
      await redisClient.del(cacheKey);
      await redisClient.del('batches:all');

      // Publish event to Redis Pub/Sub
      await redisClient.publish('inventory_updates', JSON.stringify({
        type: 'CLAIM_ACCEPTED',
        city: delivery_city.trim(),
        batch_id,
        claim_id
      }));

      res.status(200).json({ message: 'Request accepted successfully.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Accept Claim Error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept claim' });
  }
};

/**
 * Fetch claims for a Charity
 */
const getMyClaims = async (req, res) => {
  const charity_id = req.user.user_id;
  try {
    const query = `
      SELECT c.claim_id, c.batch_id, c.pickup_status, c.claimed_at, fb.description, fb.weight_kg, u.name as donor_name, u.address as donor_address
      FROM Claims c
      JOIN Food_Batches fb ON c.batch_id = fb.batch_id
      JOIN Users u ON fb.donor_id = u.user_id
      WHERE c.charity_id = ?
      ORDER BY c.claimed_at DESC
    `;
    const [claims] = await pool.execute(query, [charity_id]);
    res.status(200).json(claims);
  } catch (error) {
    console.error('Error fetching my claims:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
};

module.exports = { requestBatch, getPendingRequests, acceptClaim, getMyClaims };
