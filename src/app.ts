import cookieParser from 'cookie-parser';
import cors from 'cors';
import { formatISO } from 'date-fns';
import express, { type Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config';
import { globalErrorHandler, notFoundHandler } from './middlewares';
import { rootRouter } from './routes';
import { httpLogger, sendResponse } from './utils';

const app: Application = express();

// Security HTTP headers configured for cross-origin API clients & Google OAuth popups
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or local HTML) or matched origins
      if (!origin || config.CORS_ORIGIN === '*' || config.CORS_ORIGIN.split(',').includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

// Global Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: (req) => req.url === '/health',
});
app.use(apiLimiter);

// Structured HTTP request logging
app.use(httpLogger);

// Cookie parsing
app.use(cookieParser());

// Request body parsers with raw body preservation for Stripe webhooks
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Liveness & health check
app.get('/health', (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Coaching Center Management System API is healthy',
    data: {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: formatISO(new Date()),
      environment: config.NODE_ENV,
    },
  });
});

// Modular domain routes under /api/v1
app.use('/api/v1', rootRouter);

// 404 Route handler
app.use(notFoundHandler);

// Centralized error handling pipeline
app.use(globalErrorHandler);

export { app };
