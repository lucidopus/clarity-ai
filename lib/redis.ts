import Redis from 'ioredis';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  throw new Error("REDIS_URL is not defined in environment variables");
};

const createRedisClient = () => {
    // Basic ioredis client. 
    // If using rediss:// (TLS), ioredis handles it automatically based on protocol.
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 50, 2000);
    }
  });
};

// Global singleton to prevent multiple connections in dev/serverless
const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
