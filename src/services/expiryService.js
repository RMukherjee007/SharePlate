const cron = require('node-cron');
const pool = require('../config/db');
const { redisClient } = require('../config/redis');

/**
 * Service to automatically expire food batches that have passed their expiry_timestamp.
 * Runs every 5 minutes by default.
 */
const startExpiryDetection = () => {
  console.log('⏳ Starting Food Expiry Detection Service (Runs every 5 minutes)...');

  cron.schedule('*/5 * * * *', async () => {
    try {
      const connection = await pool.getConnection();

      try {
        // Find all batches that need to be expired
        const [expiredBatches] = await connection.execute(
          'SELECT batch_id, delivery_city FROM Food_Batches WHERE status = "available" AND expiry_timestamp < NOW()'
        );

        if (expiredBatches.length > 0) {
          console.log(`⚠️ Found ${expiredBatches.length} expired food batches. Updating status...`);

          const batchIds = expiredBatches.map(b => b.batch_id);

          // Update status to 'expired'
          // Using IN clause for bulk update (careful with large arrays, but suitable here)
          const placeholders = batchIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE Food_Batches SET status = 'expired' WHERE batch_id IN (${placeholders})`,
            batchIds
          );

          // Find unique cities for cache invalidation
          const uniqueCities = [...new Set(expiredBatches.map(b => b.delivery_city))];

          // Invalidate cache and publish events
          await redisClient.del('batches:all');
          for (const city of uniqueCities) {
            const cacheKey = `batches:${city.trim().toLowerCase()}`;
            await redisClient.del(cacheKey);
          }

          // Publish EXPIRED event to SSE clients via Redis Pub/Sub
          for (const batch of expiredBatches) {
            await redisClient.publish('inventory_updates', JSON.stringify({
              type: 'BATCH_EXPIRED',
              city: batch.delivery_city.trim(),
              batch_id: batch.batch_id
            }));
          }

          console.log('✅ Expiry processing complete. Caches invalidated and events published.');
        } else {
          // console.log('✅ No expired batches found.');
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
