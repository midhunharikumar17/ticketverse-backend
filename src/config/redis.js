// const Redis = require('ioredis');

// const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
//   retryStrategy: (times) => Math.min(times * 100, 3000),
//   lazyConnect: true,
// });

// redis.on('connect', () => console.log('Redis connected'));
// redis.on('error', (err) => console.error('Redis error:', err.message));

// module.exports = redis;
const Redis = require('ioredis');

let client;

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });
} else {
  // Local fallback
  client = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });
}

client.on('connect', () => console.log('✅ Redis connected'));
client.on('error', err => console.warn('⚠️ Redis error:', err.message));

module.exports = client;