import { randomUUID } from 'crypto';

import type { RequestHandler } from 'express';

import { logger } from '@/config/logger';

/**
 * Генерирует UUID v4, выставляет X-Request-ID и дочерний Pino-логгер с requestId.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  req.log = logger.child({ requestId: id });
  next();
};
