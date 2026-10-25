const pool = require('../config/db');
const { redisClient } = require('../config/redis');

// Built-in city coordinate lookup fallback when exact GPS coordinates are not provided
const CITY_COORDINATES = {
  'new york': { lat: 40.7128, lng: -74.0060 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'atlanta': { lat: 33.7490, lng: -84.3880 },
  'philadelphia': { lat: 39.9526, lng: -75.1652 },
  'phoenix': { lat: 33.4484, lng: -112.0740 },
  'dallas': { lat: 32.7767, lng: -96.7970 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 }
};

/**
 * Deterministic coordinate resolver: uses explicit lat/lng if valid,
 * otherwise geocodes from city name with a deterministic sub-city offset per ID/address.
 */
const resolveCoordinates = (lat, lng, city, seedStr = '') => {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (!isNaN(parsedLat) && !isNaN(parsedLng) && Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180 && (parsedLat !== 0 || parsedLng !== 0)) {
    return { latitude: Number(parsedLat.toFixed(6)), longitude: Number(parsedLng.toFixed(6)), source: 'gps' };
  }

  const normCity = (city || '').trim().toLowerCase();
  const base = CITY_COORDINATES[normCity] || CITY_COORDINATES['new york'];

  // Deterministic small offset (~0.5 to 4 km) based on address/seed so markers in the same city don't stack on 1 pixel
  let hash = 0;
  const str = String(seedStr || normCity);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((hash % 100) / 100) * 0.035 - 0.0175;
  const lngOffset = (((hash >> 8) % 100) / 100) * 0.035 - 0.0175;

  return {
    latitude: Number((base.lat + latOffset).toFixed(6)),
    longitude: Number((base.lng + lngOffset).toFixed(6)),
    source: CITY_COORDINATES[normCity] ? 'city_geocoded' : 'default_geocoded'
  };
};

/**
 * Haversine great-circle distance in kilometers
 */
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Estimate urban pickup travel time in minutes (avg 28 km/h urban speed + 6 min pickup buffer)
 */
const estimateTravelMinutes = (distanceKm) => {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  return Math.max(5, Math.round((distanceKm / 28) * 60 + 6));
};

/**
 * Multi-Objective Perishability-Aware Smart Dispatch Scoring
 */
const computeSmartDispatchScore = (batch, receiverCoords, options = {}) => {
  const now = Date.now();
  const expiryTime = batch.expiry_timestamp ? new Date(batch.expiry_timestamp).getTime() : now + 24 * 3600 * 1000;
  const remainingHours = Math.max(0, (expiryTime - now) / (1000 * 3600));

  const batchCoords = resolveCoordinates(
    batch.latitude,
    batch.longitude,
    batch.delivery_city,
    `${batch.batch_id || ''}-${batch.address || batch.pickup_address || ''}`
  );

  let distanceKm = null;
  let etaMinutes = null;
  let proximityScore = 70; // neutral when receiver location unknown

  if (receiverCoords && receiverCoords.latitude != null && receiverCoords.longitude != null) {
    distanceKm = haversineDistanceKm(
      receiverCoords.latitude,
      receiverCoords.longitude,
      batchCoords.latitude,
      batchCoords.longitude
    );
    etaMinutes = estimateTravelMinutes(distanceKm);
    // Exponential distance decay: 100 at 0km, ~74 at 5km, ~40 at 15km, ~16 at 30km
    proximityScore = Math.round(100 * Math.exp(-0.06 * distanceKm));
  }

  // Feasibility: can the charity reach the donor at least 15 minutes before expiry?
  const remainingMinutes = remainingHours * 60;
  const isFeasible = etaMinutes != null ? remainingMinutes > (etaMinutes + 15) : remainingMinutes > 15;

  // Urgency score: higher when remaining time is shorter (1h-12h window), 0 if unfeasible
  let urgencyScore = 0;
  if (isFeasible) {
    if (remainingHours <= 3) urgencyScore = 98;
    else if (remainingHours <= 6) urgencyScore = 90;
    else if (remainingHours <= 12) urgencyScore = 78;
    else if (remainingHours <= 24) urgencyScore = 62;
    else urgencyScore = 45;
  }

  // Capacity fit score
  const weightKg = parseFloat(batch.weight_kg) || 10;
  const targetCapacity = parseFloat(options.maxWeightKg) || 100;
  const capacityScore = weightKg <= targetCapacity
    ? Math.min(100, Math.round(60 + 40 * (Math.min(weightKg, 50) / 50)))
    : Math.max(20, Math.round(100 - ((weightKg - targetCapacity) / targetCapacity) * 80));

  // Dietary tag match score
  const batchTags = batch.dietary_tags
    ? String(batch.dietary_tags).split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const requestedTag = (options.dietaryTag || '').trim().toLowerCase();
  let dietaryScore = 80;
  if (requestedTag) {
    const hasTag = batchTags.some(t => t.toLowerCase() === requestedTag);
    dietaryScore = hasTag ? 100 : 25;
  }

  const rawComposite =
    0.35 * urgencyScore +
    0.35 * proximityScore +
    0.15 * capacityScore +
    0.15 * dietaryScore;

  const matchScore = isFeasible ? Math.min(99, Math.max(10, Math.round(rawComposite))) : 0;

  return {
    latitude: batchCoords.latitude,
    longitude: batchCoords.longitude,
    coord_source: batchCoords.source,
    distance_km: distanceKm,
    eta_minutes: etaMinutes,
    remaining_hours: Number(remainingHours.toFixed(1)),
    is_feasible: isFeasible,
    match_score: matchScore,
    dietary_tags: batchTags,
    score_breakdown: {
      urgency: urgencyScore,
      proximity: proximityScore,
      capacity: capacityScore,
      dietary: dietaryScore
    }
  };
};

/**
 * Sync batch coordinates into Redis GEO index when Redis is open
 */
const indexBatchGeoInRedis = async (batchId, latitude, longitude) => {
  try {
    if (redisClient && redisClient.isOpen && latitude != null && longitude != null) {
      await redisClient.geoAdd('batches:geo', {
        longitude: Number(longitude),
        latitude: Number(latitude),
        member: String(batchId)
      });
    }
  } catch (err) {
    console.warn('Redis GEOADD skipped:', err.message);
  }
};

/**
 * Idempotent startup check to ensure Food_Batches has latitude, longitude, and dietary_tags columns
 */
const ensureGeoSchema = async () => {
  try {
    const [cols] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Food_Batches'
    `);
    const existingCols = new Set(cols.map(c => c.COLUMN_NAME.toLowerCase()));

    if (!existingCols.has('latitude')) {
      await pool.execute('ALTER TABLE Food_Batches ADD COLUMN latitude DECIMAL(10, 6) DEFAULT NULL');
    }
    if (!existingCols.has('longitude')) {
      await pool.execute('ALTER TABLE Food_Batches ADD COLUMN longitude DECIMAL(10, 6) DEFAULT NULL');
    }
    if (!existingCols.has('dietary_tags')) {
      await pool.execute('ALTER TABLE Food_Batches ADD COLUMN dietary_tags VARCHAR(255) DEFAULT NULL');
    }
  } catch (err) {
    console.warn('Geo schema check skipped (DB may not be reachable yet):', err.message);
  }
};

module.exports = {
  CITY_COORDINATES,
  resolveCoordinates,
  haversineDistanceKm,
  estimateTravelMinutes,
  computeSmartDispatchScore,
  indexBatchGeoInRedis,
  ensureGeoSchema
};
