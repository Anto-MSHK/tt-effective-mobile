import jwt from 'jsonwebtoken';

import { AppError } from '@/utils/app-error';
import { verifyAccess } from '@/utils/token';

describe('verifyAccess — edge cases', () => {
  const secret = process.env.JWT_SECRET!;

  it('throws 401 when sub is missing from payload', () => {
    const token = jwt.sign({ role: 'user' }, secret, { expiresIn: 900 });
    expect(() => verifyAccess(token)).toThrow(AppError);
  });

  it('throws 401 when role is invalid', () => {
    const token = jwt.sign({ role: 'superadmin' }, secret, { subject: 'uid', expiresIn: 900 });
    expect(() => verifyAccess(token)).toThrow(AppError);
  });

  it('throws 401 when token is expired', () => {
    const token = jwt.sign({ role: 'user' }, secret, { subject: 'uid', expiresIn: -1 });
    expect(() => verifyAccess(token)).toThrow(AppError);
  });

  it('rethrows AppError as-is', () => {
    const tokenWithBadRole = jwt.sign({ role: 'hacker' }, secret, { subject: 'uid', expiresIn: 900 });
    try {
      verifyAccess(tokenWithBadRole);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(401);
    }
  });
});
