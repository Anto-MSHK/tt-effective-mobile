import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '@/utils/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that `req.params[param]` is a valid UUID v4 string.
 * Returns 400 VALIDATION_ERROR otherwise.
 */
export function validateUuid(param: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[param];
    if (!value || !UUID_REGEX.test(value)) {
      next(new AppError(400, 'VALIDATION_ERROR', `Invalid ${param}: must be a valid UUID`));
      return;
    }
    next();
  };
}
