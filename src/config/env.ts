import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  GOOGLE_CLIENT_ID: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // Initial Seed Credentials
  SUPER_ADMIN_NAME: z.string().default('System Super Admin'),
  SUPER_ADMIN_EMAIL: z.string().email().default('superadmin@coaching.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('SuperAdmin@123456'),
  SUPER_ADMIN_PHONE: z.string().default('+8801700000000'),

  ADMIN_NAME: z.string().default('Dhanmondi Branch Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@coaching.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  ADMIN_PHONE: z.string().default('+8801700000001'),
  ADMIN_BRANCH_NAME: z.string().default('Dhanmondi Campus'),
  ADMIN_BRANCH_ADDRESS: z.string().default('House 12, Road 5, Dhanmondi, Dhaka'),
  ADMIN_BRANCH_PHONE: z.string().default('+8801700000002'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    process.stderr.write(
      `CRITICAL: Invalid environment configuration:\n${JSON.stringify(result.error.format(), null, 2)}\n`,
    );
    process.exit(1);
  }
  return result.data;
};

export const config = Object.freeze(parseEnv());
export type EnvConfig = typeof config;
