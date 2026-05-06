const Redis = require('ioredis');

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL.startsWith('rediss://')
      ? { rejectUnauthorized: false }
      : undefined,
    maxRetriesPerRequest:  3,
    enableReadyCheck:      false,   // ← fixes Upstash connection issues
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 300, 3000);
    },
  });
} else {
  redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });
}

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error',   (err) => console.error('Redis error:', err.message));

module.exports = redis;