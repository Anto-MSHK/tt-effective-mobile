import { publishUserBlocked } from '@/utils/events';

import { UsersService } from '@/modules/users/users.service';

jest.mock('@/utils/events', () => ({
  publishUserRegistered: jest.fn().mockResolvedValue(undefined),
  publishUserBlocked: jest.fn().mockResolvedValue(undefined),
}));

const mockedPublishUserBlocked = jest.mocked(publishUserBlocked);

function makeUser(overrides: Partial<ReturnType<typeof base>> = {}) {
  return { ...base(), ...overrides };
}

function base() {
  return {
    id: 'user-uuid-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    role: 'user' as const,
    isActive: true,
    dateOfBirth: new Date('1990-05-20'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function buildRepo(overrides: Partial<ReturnType<typeof baseRepo>> = {}) {
  return { ...baseRepo(), ...overrides };
}

function baseRepo() {
  return {
    findById: jest.fn(),
    findManyPaginated: jest.fn(),
    blockUser: jest.fn(),
  };
}

describe('UsersService.getById', () => {
  it('returns a user', async () => {
    const user = makeUser();
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(user) });
    const svc = new UsersService(repo as never);

    const result = await svc.getById('user-uuid-1');
    expect(result.id).toBe('user-uuid-1');
    expect(result.email).toBe('jane@example.com');
    expect('passwordHash' in result).toBe(false);
  });

  it('throws 404 if user not found', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc = new UsersService(repo as never);
    await expect(svc.getById('no-exist'))
      .rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('formats dateOfBirth as YYYY-MM-DD', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(makeUser()) });
    const svc = new UsersService(repo as never);
    const result = await svc.getById('user-uuid-1');
    expect(result.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('UsersService.listUsers', () => {
  const defaultQuery = {
    page: 1, limit: 20, sortBy: 'createdAt' as const, order: 'desc' as const, search: undefined,
  };

  it('returns paginated data with meta', async () => {
    const items = [makeUser(), makeUser({ id: 'user-uuid-2', email: 'b@b.com' })];
    const repo = buildRepo({
      findManyPaginated: jest.fn().mockResolvedValue({ total: 2, items }),
    });
    const svc = new UsersService(repo as never);
    const result = await svc.listUsers(defaultQuery);

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.lastPage).toBe(1);
    expect(result.meta.hasNext).toBe(false);
  });

  it('calculates hasNext correctly', async () => {
    const repo = buildRepo({
      findManyPaginated: jest.fn().mockResolvedValue({ total: 50, items: [] }),
    });
    const svc = new UsersService(repo as never);
    const result = await svc.listUsers({ ...defaultQuery, page: 1, limit: 20 });
    expect(result.meta.lastPage).toBe(3);
    expect(result.meta.hasNext).toBe(true);
  });

  it('passes filters to repository', async () => {
    const repo = buildRepo({
      findManyPaginated: jest.fn().mockResolvedValue({ total: 0, items: [] }),
    });
    const svc = new UsersService(repo as never);
    await svc.listUsers({ ...defaultQuery, role: 'admin', status: 'active', search: 'test' });

    const call = repo.findManyPaginated.mock.calls[0][0];
    expect(call.where.role).toBe('admin');
    expect(call.where.isActive).toBe(true);
    expect(call.where.OR).toBeDefined();
  });
});

describe('UsersService.blockUser', () => {
  it('blocks a user and returns updated data', async () => {
    const user = makeUser();
    const blocked = makeUser({ isActive: false });
    const repo = buildRepo({
      findById: jest.fn().mockResolvedValue(user),
      blockUser: jest.fn().mockResolvedValue(blocked),
    });
    const svc = new UsersService(repo as never);
    const result = await svc.blockUser('actor-id', 'user-uuid-1');

    expect(result.isActive).toBe(false);
    expect(repo.blockUser).toHaveBeenCalledWith('user-uuid-1');
  });

  it('throws 404 if target user not found', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc = new UsersService(repo as never);
    await expect(svc.blockUser('actor', 'ghost'))
      .rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('does not publish event when user was already inactive', async () => {
    mockedPublishUserBlocked.mockClear();
    const alreadyInactive = makeUser({ isActive: false });
    const repo = buildRepo({
      findById: jest.fn().mockResolvedValue(alreadyInactive),
      blockUser: jest.fn().mockResolvedValue(alreadyInactive),
    });
    const svc = new UsersService(repo as never);
    await svc.blockUser('actor', 'user-uuid-1');
    expect(mockedPublishUserBlocked).not.toHaveBeenCalled();
  });
});
