import Redis from 'ioredis';
import logger from '../utils/logger';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis Client Reconnecting...');
});

// Cache helper functions
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: unknown,
  ttl: number = 3600
): Promise<void> => {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
};

export const cacheDelete = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Cache delete error:', error);
  }
};

export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error('Cache invalidate pattern error:', error);
  }
};

// Publish message to channel (for pub/sub)
export const publishMessage = async (channel: string, message: unknown): Promise<void> => {
  try {
    await redisClient.publish(channel, JSON.stringify(message));
  } catch (error) {
    logger.error('Publish message error:', error);
  }
};

export default redisClient;