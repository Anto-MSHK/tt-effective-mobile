import { randomBytes } from 'crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '@/config/env';
import { redis } from '@/db/redis';
import { AppError } from '@/utils/app-error';

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Redis sliding window rate limiter (ZADD / ZRANGEBYSCORE).
 * Каждый запрос записывается как элемент sorted set со score = timestamp.
 * Устаревшие записи удаляются перед подсчётом, что даёт честное скользящее окно.
 * Работает при любом количестве инстансов сервиса.
 */
export function createRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = clientIp(req);
    const now = Date.now();
    const windowStart = now - env.RATE_LIMIT_WINDOW_MS;
    const key = `rl:${ip}`;
    const member = `${now}-${randomBytes(4).toString('hex')}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      pipeline.zadd(key, now, member);
      pipeline.zcard(key);
      pipeline.pexpire(key, env.RATE_LIMIT_WINDOW_MS);
      const results = await pipeline.exec();

      const count = (results?.[2]?.[1] as number | null) ?? 0;

      if (count > env.RATE_LIMIT_MAX) {
        const retryAfterSec = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        next(new AppError(429, 'RATE_LIMITED', 'Too many requests'));
        return;
      }

      next();
    } catch (err) {
      req.log.warn({ err }, '[rate-limiter] redis error, allowing request');
      next();
    }
  };
}
