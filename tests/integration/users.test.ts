import request from 'supertest';

jest.mock('@/db/prisma', () => require('../__mocks__/prisma'));
jest.mock('@/db/redis', () => require('../__mocks__/redis'));

import { createApp } from '@/app';
import { prisma } from '../__mocks__/prisma';
import { signAccess } from '@/utils/token';

const app = createApp();

function makeDbUser(overrides = {}) {
  return {
    id: 'uuid-user-1',
    fullName: 'Bob Builder',
    email: 'bob@example.com',
    role: 'user' as const,
    isActive: true,
    dateOfBirth: new Date('1988-03-10'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

const userToken = signAccess('uuid-user-1', 'user');
const adminToken = signAccess('uuid-admin-1', 'admin');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /users/:id', () => {
  it('200 — user accesses own profile (self)', async () => {
    prisma.user.findUnique.mockResolvedValue(makeDbUser());

    const res = await request(app)
      .get('/users/uuid-user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('uuid-user-1');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('200 — admin accesses any profile', async () => {
    prisma.user.findUnique.mockResolvedValue(makeDbUser());

    const res = await request(app)
      .get('/users/uuid-user-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('403 — user accesses another user\'s profile', async () => {
    const res = await request(app)
      .get('/users/uuid-other-user')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('404 — user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/users/uuid-user-1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('401 — no token', async () => {
    const res = await request(app).get('/users/uuid-user-1');
    expect(res.status).toBe(401);
  });
});

describe('GET /users (list)', () => {
  it('200 — admin gets paginated list', async () => {
    const items = [makeDbUser(), makeDbUser({ id: 'uuid-user-2', email: 'c@c.com' })];
    prisma.user.count.mockResolvedValue(2);
    prisma.user.findMany.mockResolvedValue(items);

    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta).toHaveProperty('lastPage');
    expect(res.body.meta).toHaveProperty('hasNext');
  });

  it('200 — admin filters by role', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([makeDbUser({ role: 'admin' })]);

    const res = await request(app)
      .get('/users?role=admin&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].role).toBe('admin');
  });

  it('400 — invalid query param (page=0)', async () => {
    const res = await request(app)
      .get('/users?page=0')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('403 — regular user cannot access list', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('401 — no token', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /users/:id/block', () => {
  it('200 — admin blocks any user', async () => {
    const user = makeDbUser();
    const blocked = makeDbUser({ isActive: false });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(blocked);

    const res = await request(app)
      .patch('/users/uuid-user-1/block')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('200 — user can block themselves (self)', async () => {
    const user = makeDbUser();
    const blocked = makeDbUser({ isActive: false });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(blocked);

    const res = await request(app)
      .patch('/users/uuid-user-1/block')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });

  it('403 — user cannot block another user', async () => {
    const res = await request(app)
      .patch('/users/uuid-other/block')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('404 — target user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/users/uuid-user-1/block')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('401 — no token', async () => {
    const res = await request(app).patch('/users/uuid-user-1/block');
    expect(res.status).toBe(401);
  });
});
