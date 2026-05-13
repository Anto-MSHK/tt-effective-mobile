import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '@/utils/app-error';

type AuthorizeMode = 'admin' | 'self';

/**
 * `authorize('admin')` — только admin.
 * `authorize('self', 'admin')` — admin или доступ к ресурсу с id из `req.params.id` (self).
 */
export function authorize(...modes: AuthorizeMode[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const isAdmin = req.user.role === 'admin';

    if (modes.length === 1 && modes[0] === 'admin') {
      if (!isAdmin) {
        next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
        return;
      }
      next();
      return;
    }

    if (modes.includes('self') && modes.includes('admin')) {
      const resourceId = req.params.id;
      if (!resourceId) {
        next(new AppError(500, 'INTERNAL_ERROR', 'Missing :id route param for authorize'));
        return;
      }
      const isSelf = resourceId === req.user.sub;
      if (isAdmin || isSelf) {
        next();
        return;
      }
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }

    next(new AppError(500, 'INTERNAL_ERROR', 'Invalid authorize configuration'));
  };
}
