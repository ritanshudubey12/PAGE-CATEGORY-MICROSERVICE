import { app } from './app';
import { config } from './config/env';
import { pool, checkDatabaseReady } from './config/database';
import { logger } from './utils/logger';

const PORT = config.port;

const server = app.listen(PORT, async () => {
  logger.info(`Page Category Microservice is running on port ${PORT} in ${config.nodeEnv} mode`);
  const isDbReady = await checkDatabaseReady();
  if (isDbReady) {
    logger.info('PostgreSQL connection verified successfully');
  } else {
    logger.warn('PostgreSQL database connection is currently NOT ready');
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('PostgreSQL pool drained and closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during PostgreSQL pool shutdown', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  });

  // Force shutdown after 10s if dangling connections
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
