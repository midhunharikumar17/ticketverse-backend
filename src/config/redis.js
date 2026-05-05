// const Redis = require('ioredis');

// const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
//   retryStrategy: (times) => Math.min(times * 100, 3000),
//   lazyConnect: true,
// });

// redis.on('connect', () => console.log('Redis connected'));
// redis.on('error', (err) => console.error('Redis error:', err.message));

// module.exports = redis;
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    return Math.min(times * 100, 2000); // backoff
  },

  maxRetriesPerRequest: 3,   // 🔥 critical fix
  connectTimeout: 10000,     // fail fast

  lazyConnect: false,        // 🔥 connect immediately
});

redis.on('connect', () => console.log('Redis connected'));

redis.on('error', (err) => {
  console.error('Redis error:', err); // full error
});

module.exports = redis;