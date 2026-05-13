import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { prisma } from '@/db/prisma';
import { redis } from '@/db/redis';

const port = env.PORT;
const app = createApp();

const server = app.listen(port, () => {
  logger.info(`HTTP server listening on port ${port}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received — closing gracefully');

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server');
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (e) {
      logger.error({ err: e }, 'Error disconnecting Prisma');
    }

    try {
      await redis.quit();
      logger.info('Redis disconnected');
    } catch (e) {
      logger.error({ err: e }, 'Error quitting Redis');
    }

    process.exit(err ? 1 : 0);
  });
}

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGTERM', () => shutdown('SIGTERM'));
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGINT', () => shutdown('SIGINT'));
