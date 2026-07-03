const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

const subscriber = client.duplicate();

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Connected to Redis (Publisher/Cache)'));

subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
subscriber.on('connect', () => console.log('Connected to Redis (Subscriber)'));

// Self-invoking async function to connect both clients
(async () => {
  try {
    await client.connect();
    await subscriber.connect();
  } catch (err) {
    console.error('Failed to connect to Redis on startup', err);
  }
})();

module.exports = { redisClient: client, redisSubscriber: subscriber };
