import Redis from 'ioredis';

// Lazy singleton — only created when first accessed.
// This prevents module-load errors when REDIS_URL is not set (e.g. local dev without Redis).
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not configured');

  _redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying after 3 attempts
      return Math.min(times * 50, 2000);
    },
  });

  return _redis;
}

// Legacy named export for backward compatibility
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return getRedis()[prop as keyof Redis];
  },
});

export default redis;
