const pool = require('../config/db');
const { redisClient } = require('../config/redis');
const {
  resolveCoordinates,
  computeSmartDispatchScore,
  indexBatchGeoInRedis
} = require('../services/geoService');
const { optimizePickupRoute } = require('../services/routeOptimizerService');
const { predictSpoilageRisk } = require('../services/spoilageModelService');
const { analyzeFoodDonation } = require('../services/foodAnalyzerService');

/**
 * Finds all 'available' Food_Batches with Perishability-Aware Geospatial Matching & Smart Dispatch Scoring.
 */
const getAvailableBatchesNearby = async (req, res) => {
  const { city, lat, lng, radius_km, dietary_tag, sort_by } = req.query;
  const normalizedCity = city ? city.trim().toLowerCase() : '';

  const cacheKey = normalizedCity ? `batches:${normalizedCity}` : 'batches:all';

  try {
    // Check Cache first for raw available batches
    let rawBatches = null;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        rawBatches = parsed.batches || [];
      }
    } catch (redisErr) {
      console.warn('Redis GET error, falling back to MySQL:', redisErr.message);
    }

    if (!rawBatches) {
      let query;
      let queryParams = [];
      
      if (normalizedCity !== '') {
        query = `
          SELECT 
            fb.*,
            fb.pickup_address AS address
          FROM Food_Batches fb
          WHERE fb.status = 'available'
            AND (fb.expiry_timestamp IS NULL OR fb.expiry_timestamp > NOW())
            AND LOWER(fb.delivery_city) = ?
          ORDER BY fb.batch_id DESC;
        `;
        queryParams = [normalizedCity];
      } else {
        query = `
          SELECT 
            fb.*,
            fb.pickup_address AS address
          FROM Food_Batches fb
          WHERE fb.status = 'available'
            AND (fb.expiry_timestamp IS NULL OR fb.expiry_timestamp > NOW())
          ORDER BY fb.batch_id DESC;
        `;
      }

      const [rows] = await pool.execute(query, queryParams);
      rawBatches = rows;

      // Set Cache with 1-hour TTL (3600 seconds)
      try {
        await redisClient.set(cacheKey, JSON.stringify({ count: rows.length, batches: rows }), { EX: 3600 });
      } catch (redisErr) {
        console.warn('Redis SET error, ignoring:', redisErr.message);
      }
    }

    // Resolve receiver coordinates if lat/lng or city provided
    let receiverCoords = null;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      receiverCoords = { latitude: parsedLat, longitude: parsedLng };
    } else if (normalizedCity) {
      receiverCoords = resolveCoordinates(null, null, normalizedCity, 'receiver-center');
    }

    // Enrich each batch with Smart Dispatch geospatial metrics and ML Spoilage Risk
    let enrichedBatches = rawBatches.map(b => {
      const geoMetrics = computeSmartDispatchScore(b, receiverCoords, {
        dietaryTag: dietary_tag
      });
      const spoilageMetrics = predictSpoilageRisk(b);
      return {
        ...b,
        address: b.address || b.pickup_address,
        ...geoMetrics,
        ...spoilageMetrics
      };
    });

    // Optional radius filter (in km)
    const maxRadiusKm = parseFloat(radius_km);
    if (!isNaN(maxRadiusKm) && maxRadiusKm > 0 && receiverCoords) {
      enrichedBatches = enrichedBatches.filter(b => b.distance_km != null && b.distance_km <= maxRadiusKm);
    }

    // Optional dietary tag filter
    if (dietary_tag && dietary_tag.trim() !== '') {
      const targetTag = dietary_tag.trim().toLowerCase();
      enrichedBatches = enrichedBatches.filter(b =>
        Array.isArray(b.dietary_tags) && b.dietary_tags.some(t => t.toLowerCase() === targetTag)
      );
    }

    // Sort batches by chosen strategy
    if (sort_by === 'distance' && receiverCoords) {
      enrichedBatches.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
    } else if (sort_by === 'expiry') {
      enrichedBatches.sort((a, b) => (a.remaining_hours ?? 999) - (b.remaining_hours ?? 999));
    } else if (sort_by === 'spoilage_risk') {
      enrichedBatches.sort((a, b) => (b.spoilage_probability ?? 0) - (a.spoilage_probability ?? 0));
    } else if (sort_by === 'match_score' || receiverCoords) {
      enrichedBatches.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    }

    res.status(200).json({
      count: enrichedBatches.length,
      receiver_coords: receiverCoords,
      batches: enrichedBatches
    });
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
      SELECT batch_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, created_at
      FROM Food_Batches
      WHERE donor_id = ?
      ORDER BY batch_id DESC
    `;
    const [batches] = await pool.execute(query, [donor_id]);
    const enriched = batches.map(b => ({
      ...b,
      ...(b.status === 'available' ? predictSpoilageRisk(b) : { spoilage_probability: 0, risk_tier: 'N/A' })
    }));
    
    res.status(200).json({
      batches: enriched
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
  const { description, batch_type, weight_kg, expiry_hours, delivery_city, donor_name, pickup_address, latitude, longitude, dietary_tags } = req.body;

  if (!description || !batch_type || !weight_kg || !expiry_hours || !delivery_city || !donor_name || !pickup_address) {
    return res.status(400).json({ error: 'Missing required fields including donor_name and pickup_address' });
  }

  const ALLOWED_BATCH_TYPES = ['Dry_Goods', 'Refrigerated', 'Produce', 'Prepared_Meals', 'Baked_Goods', 'Dairy', 'Beverages', 'Other'];
  if (!ALLOWED_BATCH_TYPES.includes(batch_type)) {
    return res.status(400).json({ error: 'Invalid batch_type' });
  }

  if (
    String(description).trim().length > 1000 ||
    String(delivery_city).trim().length > 100 ||
    String(donor_name).trim().length > 255 ||
    String(pickup_address).trim().length > 255
  ) {
    return res.status(400).json({ error: 'One or more fields exceed maximum allowed length' });
  }

  const parsedWeight = parseFloat(weight_kg);
  const parsedExpiryHours = parseInt(expiry_hours, 10);
  if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100000 || isNaN(parsedExpiryHours) || parsedExpiryHours <= 0 || parsedExpiryHours > 720) {
    return res.status(400).json({ error: 'Weight and expiry hours must be valid positive numbers' });
  }

  const coords = resolveCoordinates(latitude, longitude, delivery_city, pickup_address);
  const normalizedTags = Array.isArray(dietary_tags)
    ? dietary_tags.map(t => String(t).trim()).filter(Boolean).join(',').slice(0, 255)
    : (dietary_tags ? String(dietary_tags).trim().slice(0, 255) : null);

  try {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + parsedExpiryHours);
    const expiryStr = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let result;
      try {
        [result] = await connection.execute(
          'INSERT INTO Food_Batches (donor_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, donor_name, pickup_address, latitude, longitude, dietary_tags) VALUES (?, ?, ?, ?, ?, \'available\', ?, ?, ?, ?, ?, ?)',
          [donor_id, description.trim(), batch_type, parsedWeight, expiryStr, delivery_city.trim(), donor_name.trim(), pickup_address.trim(), coords.latitude, coords.longitude, normalizedTags]
        );
      } catch (_colErr) {
        // Fallback if latitude/longitude/dietary_tags columns haven't been migrated yet
        [result] = await connection.execute(
          'INSERT INTO Food_Batches (donor_id, description, batch_type, weight_kg, expiry_timestamp, status, delivery_city, donor_name, pickup_address) VALUES (?, ?, ?, ?, ?, \'available\', ?, ?, ?)',
          [donor_id, description.trim(), batch_type, parsedWeight, expiryStr, delivery_city.trim(), donor_name.trim(), pickup_address.trim()]
        );
      }

      await connection.commit();
      await indexBatchGeoInRedis(result.insertId, coords.latitude, coords.longitude);
      
      // Cache Invalidation & Pub/Sub
      try {
        const cacheKey = `batches:${delivery_city.trim().toLowerCase()}`;
        await redisClient.del(cacheKey);
        await redisClient.del('batches:all');
        console.log(`Successfully invalidated Redis cache for ${cacheKey} and batches:all`);

        await redisClient.publish('inventory_updates', JSON.stringify({
          type: 'NEW_BATCH',
          city: delivery_city.trim(),
          batch_id: result.insertId,
          description,
          weight_kg
        }));
      } catch (redisErr) {
        console.warn('Redis DEL/PUBLISH error after successful commit:', redisErr.message);
      }

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

/**
 * Multi-Stop Pickup Route Optimizer (CTSP-TW) for NGOs/Charities
 */
const optimizeRouteHandler = async (req, res) => {
  const { batch_ids, lat, lng, city, max_capacity_kg } = req.body;

  try {
    const startCoords = resolveCoordinates(lat, lng, city || 'New York', 'ngo-origin');

    let query;
    let params = [];
    if (Array.isArray(batch_ids) && batch_ids.length > 0) {
      const safeIds = batch_ids.slice(0, 25).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (safeIds.length === 0) {
        return res.status(400).json({ error: 'No valid batch_ids provided' });
      }
      const placeholders = safeIds.map(() => '?').join(',');
      query = `
        SELECT fb.*, fb.pickup_address AS address
        FROM Food_Batches fb
        WHERE fb.status = 'available'
          AND (fb.expiry_timestamp IS NULL OR fb.expiry_timestamp > NOW())
          AND fb.batch_id IN (${placeholders})
      `;
      params = safeIds;
    } else if (city && String(city).trim() !== '') {
      query = `
        SELECT fb.*, fb.pickup_address AS address
        FROM Food_Batches fb
        WHERE fb.status = 'available'
          AND (fb.expiry_timestamp IS NULL OR fb.expiry_timestamp > NOW())
          AND LOWER(fb.delivery_city) = ?
        ORDER BY fb.expiry_timestamp ASC
        LIMIT 12
      `;
      params = [String(city).trim().toLowerCase()];
    } else {
      query = `
        SELECT fb.*, fb.pickup_address AS address
        FROM Food_Batches fb
        WHERE fb.status = 'available'
          AND (fb.expiry_timestamp IS NULL OR fb.expiry_timestamp > NOW())
        ORDER BY fb.expiry_timestamp ASC
        LIMIT 12
      `;
    }

    const [batches] = await pool.execute(query, params);
    const result = optimizePickupRoute(startCoords, batches, max_capacity_kg);
    res.status(200).json(result);
  } catch (error) {
    console.error('Route Optimization Error:', error);
    res.status(500).json({ error: 'Failed to optimize pickup route' });
  }
};

/**
 * Neural Network Vision & Culinary NLP Auto-Tagger for Food Donations
 */
const analyzeFoodHandler = async (req, res) => {
  const { notes, fileName, imageDataUrl, visualProfile, cnnDetections, mobilenetPredictions } = req.body || {};
  try {
    const analysis = await analyzeFoodDonation({
      notes,
      fileName,
      imageDataUrl,
      visualProfile,
      cnnDetections,
      mobilenetPredictions
    });
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Food Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze food donation' });
  }
};

module.exports = { getAvailableBatchesNearby, getMyBatches, createBatch, optimizeRouteHandler, analyzeFoodHandler };
