import { hashToken, signAccess, signRefresh, verifyAccess } from '@/utils/token';
import { AppError } from '@/utils/app-error';

describe('hashToken', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('sometoken');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });
});

describe('signRefresh', () => {
  it('returns a non-empty string', () => {
    const token = signRefresh();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('generates unique tokens', () => {
    expect(signRefresh()).not.toBe(signRefresh());
  });
});

describe('signAccess / verifyAccess', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  it('signs and verifies a user token', () => {
    const token = signAccess(userId, 'user');
    const payload = verifyAccess(token);
    expect(payload.sub).toBe(userId);
    expect(payload.role).toBe('user');
  });

  it('signs and verifies an admin token', () => {
    const token = signAccess(userId, 'admin');
    const payload = verifyAccess(token);
    expect(payload.role).toBe('admin');
  });

  it('throws AppError 401 for a tampered token', () => {
    const token = signAccess(userId, 'user');
    const tampered = `${token}x`;
    expect(() => verifyAccess(tampered)).toThrow(AppError);
    try {
      verifyAccess(tampered);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(401);
      expect((err as AppError).code).toBe('UNAUTHORIZED');
    }
  });

  it('throws AppError 401 for a random string', () => {
    expect(() => verifyAccess('not.a.jwt')).toThrow(AppError);
  });
});
