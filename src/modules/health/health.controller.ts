import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Request, Response } from 'express';

import { prisma } from '@/db/prisma';
import { redis } from '@/db/redis';

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Проверка готовности сервиса
 *     responses:
 *       '200':
 *         description: БД и Redis доступны
 *       '503':
 *         description: Деградация зависимостей
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  let db: 'ok' | 'error' = 'error';
  let redisStatus: 'ok' | 'error' = 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (err) {
    req.log.error({ err }, '[health] database check failed');
  }

  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      redisStatus = 'ok';
    }
  } catch (err) {
    req.log.error({ err }, '[health] redis check failed');
  }

  const healthy = db === 'ok' && redisStatus === 'ok';
  const body = {
    status: healthy ? 'ok' : 'degraded',
    db,
    redis: redisStatus,
    uptime: process.uptime(),
    version: readPackageVersion(),
  };

  res.status(healthy ? 200 : 503).json(body);
}
