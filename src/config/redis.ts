import { createClient } from 'redis';
import { logger } from './logger';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

export const initializeRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis connection initialized successfully');
  } catch (error) {
    logger.error('Error during Redis initialization:', error);
    throw error;
  }
};

export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '1800', 10);