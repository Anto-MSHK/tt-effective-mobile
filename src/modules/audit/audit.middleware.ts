import type { NextFunction, Request, Response } from 'express';

import { logger } from '@/config/logger';
import { prisma } from '@/db/prisma';

import { AuditAction } from './audit.constants';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (req.ip && req.ip.length > 0) return req.ip;
  return '127.0.0.1';
}

function resolveAuditMeta(req: Request): { action: string; targetId: string | null } | null {
  const routePath = req.route?.path;
  if (!routePath || !req.user) return null;

  const { id } = req.params;

  if (req.method === 'GET' && routePath === '/') {
    return { action: AuditAction.LIST_USERS, targetId: null };
  }
  if (req.method === 'GET' && routePath === '/:id') {
    return id ? { action: AuditAction.GET_USER, targetId: id } : null;
  }
  if (req.method === 'PATCH' && routePath === '/:id/block') {
    return id ? { action: AuditAction.BLOCK_USER, targetId: id } : null;
  }
  return null;
}

/**
 * После успешного ответа (2xx) пишет строку в `audit_log` для маршрутов `/users/*`.
 */
export function auditLog(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const meta = resolveAuditMeta(req);
      if (!meta || !req.user) return;

      const ip = getClientIp(req);
      const userAgent = req.get('user-agent') ?? '';

      prisma.auditLog
        .create({
          data: {
            actorId: req.user.sub,
            targetId: meta.targetId,
            action: meta.action,
            ip,
            userAgent,
          },
        })
        .catch((err) => {
          logger.error({ err, requestId: req.requestId, action: meta.action }, '[audit] failed to persist audit log');
        });
    });

    next();
  };
}
