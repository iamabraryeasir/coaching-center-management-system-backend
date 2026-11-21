import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from './env';

const isProduction = config.NODE_ENV === 'production';
const isLocalhost =
  config.DATABASE_URL.includes('localhost') ||
  config.DATABASE_URL.includes('127.0.0.1') ||
  config.DATABASE_URL.includes('@postgres:');

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ...(isProduction && !isLocalhost
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export { pool };
