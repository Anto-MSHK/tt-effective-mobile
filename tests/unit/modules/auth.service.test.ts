import { Prisma } from '@prisma/client';

import { AuthService } from '@/modules/auth/auth.service';

jest.mock('@/utils/events', () => ({
  publishUserRegistered: jest.fn().mockResolvedValue(undefined),
  publishUserBlocked: jest.fn().mockResolvedValue(undefined),
}));

const makeUser = (overrides: Partial<ReturnType<typeof baseUser>> = {}) => ({
  ...baseUser(),
  ...overrides,
});

function baseUser() {
  return {
    id: 'user-uuid-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: '$2b$10$hashedpassword',
    role: 'user' as const,
    isActive: true,
    dateOfBirth: new Date('1990-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function makeRepo(overrides: Partial<ReturnType<typeof buildRepo>> = {}) {
  return { ...buildRepo(), ...overrides };
}

function buildRepo() {
  return {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    createRefreshToken: jest.fn().mockResolvedValue({ id: 'token-id' }),
    findValidRefreshTokenByHash: jest.fn(),
    rotateRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeRefreshTokenById: jest.fn().mockResolvedValue(undefined),
  };
}

describe('AuthService.register', () => {
  it('creates a user and returns tokens', async () => {
    const user = makeUser();
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue(user),
    });
    const svc = new AuthService(repo as never);

    const result = await svc.register({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'Admin1!Strong',
      dateOfBirth: '1990-01-01',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('john@example.com');
  });

  it('throws 422 if user is under 18', async () => {
    const repo = makeRepo();
    const svc = new AuthService(repo as never);

    const tooYoungYear = new Date().getFullYear() - 10;
    await expect(
      svc.register({
        fullName: 'Kid',
        email: 'kid@example.com',
        password: 'Admin1!Strong',
        dateOfBirth: `${tooYoungYear}-06-15`,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'AGE_TOO_YOUNG' });
  });

  it('throws 409 if email already taken (P2002)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockRejectedValue(p2002),
    });
    const svc = new AuthService(repo as never);

    await expect(
      svc.register({
        fullName: 'Dup User',
        email: 'dup@example.com',
        password: 'Admin1!Strong',
        dateOfBirth: '1990-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_TAKEN' });
  });
});

describe('AuthService.login', () => {
  it('returns tokens for valid credentials', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Admin1!Strong', 10);
    const user = makeUser({ passwordHash: hash });
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(user) });
    const svc = new AuthService(repo as never);

    const result = await svc.login({ email: 'john@example.com', password: 'Admin1!Strong' });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('throws 401 for unknown email', async () => {
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(null) });
    const svc = new AuthService(repo as never);
    await expect(svc.login({ email: 'x@x.com', password: 'Admin1!Strong' }))
      .rejects.toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
  });

  it('throws 401 for wrong password', async () => {
    const user = makeUser({ passwordHash: await (await import('bcrypt')).hash('Correct1!', 10) });
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(user) });
    const svc = new AuthService(repo as never);
    await expect(svc.login({ email: 'john@example.com', password: 'Wrong1!' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 if account is inactive', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Admin1!', 10);
    const user = makeUser({ passwordHash: hash, isActive: false });
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(user) });
    const svc = new AuthService(repo as never);
    await expect(svc.login({ email: 'john@example.com', password: 'Admin1!' }))
      .rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

describe('AuthService.refresh (token rotation)', () => {
  it('returns new token pair and rotates', async () => {
    const user = makeUser();
    const repo = makeRepo({
      findValidRefreshTokenByHash: jest.fn().mockResolvedValue({
        id: 'rt-id', userId: user.id, user,
      }),
    });
    const svc = new AuthService(repo as never);
    const result = await svc.refresh({ refreshToken: 'sometoken' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(repo.rotateRefreshToken).toHaveBeenCalledWith('rt-id', user.id, expect.any(String));
  });

  it('throws 401 if token not found', async () => {
    const repo = makeRepo({ findValidRefreshTokenByHash: jest.fn().mockResolvedValue(null) });
    const svc = new AuthService(repo as never);
    await expect(svc.refresh({ refreshToken: 'bad' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 if account is inactive', async () => {
    const user = makeUser({ isActive: false });
    const repo = makeRepo({
      findValidRefreshTokenByHash: jest.fn().mockResolvedValue({ id: 'rt-id', userId: user.id, user }),
    });
    const svc = new AuthService(repo as never);
    await expect(svc.refresh({ refreshToken: 'tok' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('AuthService.logout', () => {
  it('revokes the refresh token', async () => {
    const user = makeUser();
    const repo = makeRepo({
      findValidRefreshTokenByHash: jest.fn().mockResolvedValue({
        id: 'rt-id', userId: user.id, user,
      }),
    });
    const svc = new AuthService(repo as never);
    await svc.logout(user.id, { refreshToken: 'tok' });
    expect(repo.revokeRefreshTokenById).toHaveBeenCalledWith('rt-id');
  });

  it('throws 401 if token not found', async () => {
    const repo = makeRepo({ findValidRefreshTokenByHash: jest.fn().mockResolvedValue(null) });
    const svc = new AuthService(repo as never);
    await expect(svc.logout('uid', { refreshToken: 'bad' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 if token belongs to another user', async () => {
    const repo = makeRepo({
      findValidRefreshTokenByHash: jest.fn().mockResolvedValue({
        id: 'rt-id', userId: 'other-user', user: makeUser({ id: 'other-user' }),
      }),
    });
    const svc = new AuthService(repo as never);
    await expect(svc.logout('current-user', { refreshToken: 'tok' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});
