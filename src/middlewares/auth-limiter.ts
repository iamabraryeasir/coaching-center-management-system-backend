import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Dedicated rate limiter for sensitive authentication endpoints.
 * Protects against credential stuffing and brute-force dictionary attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  limit: 15, // Max 15 attempts per IP per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => config.NODE_ENV === 'test',
});
