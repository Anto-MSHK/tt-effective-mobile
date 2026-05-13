import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@/utils/app-error';
import { verifyAccess } from '@/utils/token';

/**
 * Проверяет Bearer access JWT, заполняет req.user (sub, role).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    req.user = verifyAccess(token);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
