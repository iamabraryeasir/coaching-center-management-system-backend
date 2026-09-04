import type { Server } from 'node:http';
import { app } from './app';
import { config, pool, prisma } from './config';
import { logger, seedData } from './utils';

let server: Server;

const startServer = async (): Promise<void> => {
  try {
    logger.info('Connecting to PostgreSQL database via Prisma...');
    await prisma.$connect();
    logger.info('PostgreSQL database connected successfully.');

    // Seed initial SuperAdmin and Branch Admin if they do not exist
    await seedData();

    server = app.listen(config.PORT, () => {
      logger.info('=======================================================');
      logger.info('  Coaching Center Management System Backend Running');
      logger.info(`  Environment : ${config.NODE_ENV}`);
      logger.info(`  Port        : ${config.PORT}`);
      logger.info(`  Health Check: http://localhost:${config.PORT}/health`);
      logger.info(`  API Base    : http://localhost:${config.PORT}/api/v1`);
      logger.info('=======================================================');
    });

    server.on('error', (error: Error) => {
      logger.error('HTTP Server encountered an error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const handleGracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            logger.info('HTTP server closed successfully.');
            resolve();
          }
        });
      });
    }

    await prisma.$disconnect();
    logger.info('Database client disconnected successfully.');

    await pool.end();
    logger.info('Database connection pool ended.');

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
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
