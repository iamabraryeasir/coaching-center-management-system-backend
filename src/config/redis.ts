import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils';
import { config } from './env';

export const redis: RedisClientType = createClient({
  url: config.REDIS_URL,
});

redis.on('error', (err: Error) => {
  logger.warn(`Redis client warning: ${err.message}`);
});

redis.on('connect', () => {
  logger.info('Connecting to Redis server...');
});

redis.on('ready', () => {
  logger.info('Redis client connected and ready to accept commands.');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
  } catch (error) {
    logger.warn(`Redis connection failed: ${(error as Error).message}. (Check REDIS_URL)`);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redis.isOpen) {
      await redis.quit();
      logger.info('Redis connection closed successfully.');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};
