import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '@/config/logger';
import { AppError } from '@/utils/app-error';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express error middleware signature
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';
  const log = req.log ?? logger.child({ requestId });

  if (err instanceof AppError) {
    log.warn(
      { err: { code: err.code, message: err.message, statusCode: err.statusCode } },
      err.message,
    );
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, requestId },
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Validation failed';
    log.warn({ err: { zod: err.flatten() } }, 'Validation error');
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message, requestId },
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    log.warn({ err }, 'Invalid JSON');
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body', requestId },
    });
    return;
  }

  if (err instanceof Error && 'type' in err && (err as Error & { type: string }).type === 'entity.too.large') {
    log.warn({ err }, 'Payload too large');
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large', requestId },
    });
    return;
  }

  log.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId },
  });
}
