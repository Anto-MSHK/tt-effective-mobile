import { logger } from '@/config/logger';
import { redis } from '@/db/redis';

export async function publishUserRegistered(payload: { userId: string; email: string }): Promise<void> {
  try {
    await redis.publish('user.registered', JSON.stringify(payload));
  } catch (err) {
    logger.error({ err }, '[events] publish user.registered failed');
  }
}

export async function publishUserBlocked(payload: { userId: string; actorId: string }): Promise<void> {
  try {
    await redis.publish('user.blocked', JSON.stringify(payload));
  } catch (err) {
    logger.error({ err }, '[events] publish user.blocked failed');
  }
}
