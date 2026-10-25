const cron = require('node-cron');
const pool = require('../config/db');
const { redisClient } = require('../config/redis');
const { predictSpoilageRisk, trainAndEvaluateSpoilageModel } = require('./spoilageModelService');

/**
 * Service to automatically expire food batches that have passed their expiry_timestamp
 * and auto-escalate high-spoilage-risk batches via Urgent Rescue SSE alerts.
 * Runs every 5 minutes by default.
 */
const startExpiryDetection = () => {
  console.log('⏳ Starting Food Expiry & ML Spoilage Escalation Service (Runs every 5 minutes)...');

  // Initial model calibration on startup
  trainAndEvaluateSpoilageModel().catch(err => console.warn('Initial ML calibration skipped:', err.message));

  cron.schedule('*/5 * * * *', async () => {
    try {
      const connection = await pool.getConnection();

      try {
        // 1. Find all batches that need to be expired
        const [expiredBatches] = await connection.execute(
          'SELECT batch_id, delivery_city FROM Food_Batches WHERE status = "available" AND expiry_timestamp < NOW()'
        );

        if (expiredBatches.length > 0) {
          console.log(`⚠️ Found ${expiredBatches.length} expired food batches. Updating status...`);

          const batchIds = expiredBatches.map(b => b.batch_id);
          const placeholders = batchIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE Food_Batches SET status = 'expired' WHERE batch_id IN (${placeholders})`,
            batchIds
          );

          const uniqueCities = [...new Set(expiredBatches.map(b => (b.delivery_city || '').trim()).filter(Boolean))];

          try {
            await redisClient.del('batches:all');
            for (const city of uniqueCities) {
              const cacheKey = `batches:${city.toLowerCase()}`;
              await redisClient.del(cacheKey);
            }

            for (const batch of expiredBatches) {
              await redisClient.publish('inventory_updates', JSON.stringify({
                type: 'BATCH_EXPIRED',
                city: (batch.delivery_city || '').trim(),
                batch_id: batch.batch_id
              }));
            }
          } catch (redisErr) {
            console.warn('⚠️ Redis cache invalidation/publish failed during expiry check:', redisErr.message);
          }

          console.log('✅ Expiry processing complete. Caches invalidated and events published.');
        }

        // 2. ML Spoilage Risk Scan & Urgent Rescue Auto-Escalation
        const [activeBatches] = await connection.execute(
          'SELECT batch_id, description, batch_type, weight_kg, expiry_timestamp, delivery_city, created_at FROM Food_Batches WHERE status = "available" AND expiry_timestamp >= NOW() LIMIT 200'
        );

        const urgentBatches = activeBatches
          .map(b => ({ ...b, ...predictSpoilageRisk(b) }))
          .filter(b => b.urgent_rescue_recommended);

        if (urgentBatches.length > 0) {
          try {
            await redisClient.publish('inventory_updates', JSON.stringify({
              type: 'URGENT_RESCUE_ALERT',
              count: urgentBatches.length,
              batches: urgentBatches.slice(0, 5).map(b => ({
                batch_id: b.batch_id,
                description: b.description,
                city: (b.delivery_city || '').trim(),
                spoilage_probability: b.spoilage_probability
              }))
            }));
          } catch (_redisErr) {
            // Ignore Redis publish errors
          }
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('❌ Expiry Service Error:', error);
    }
  });
};

module.exports = { startExpiryDetection };
