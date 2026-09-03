import type { Server } from 'node:http';
import { app } from './app';
import { config } from './config';
import { logger } from './utils';

let server: Server;

const startServer = (): void => {
  try {
    server = app.listen(config.PORT, () => {
      logger.info('=======================================================');
      logger.info('  Coaching Center Management System Backend Running');
      logger.info(`  Environment : ${config.NODE_ENV}`);
      logger.info(`  Port        : ${config.PORT}`);
      logger.info(`  Health Check: http://localhost:${config.PORT}/health`);
      logger.info(`  API Base    : http://localhost:${config.PORT}/api/v1`);
      logger.info('=======================================================');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const handleGracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed successfully.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection detected:', reason);
  process.exit(1);
});

startServer();
