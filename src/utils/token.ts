import { createHash, randomBytes } from 'crypto';

import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '@/config/env';
import { AppError } from '@/utils/app-error';

export function hashToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

/**
 * Opaque refresh token (хранится в БД только как SHA-256).
 */
export function signRefresh(): string {
  return randomBytes(48).toString('base64url');
}

export function signAccess(sub: string, role: 'admin' | 'user'): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: sub,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccess(token: string): { sub: string; role: 'admin' | 'user' } {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }
    if (payload.role !== 'admin' && payload.role !== 'user') {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }
    return { sub: payload.sub, role: payload.role };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
