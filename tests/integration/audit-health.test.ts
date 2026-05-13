import request from 'supertest';

jest.mock('@/db/prisma', () => require('../__mocks__/prisma'));
jest.mock('@/db/redis', () => require('../__mocks__/redis'));

import { createApp } from '@/app';
import { prisma } from '../__mocks__/prisma';
import { signAccess } from '@/utils/token';

const app = createApp();
const adminToken = signAccess('uuid-admin-1', 'admin');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /audit-log', () => {
  it('200 — admin получает журнал с пагинацией', async () => {
    const rows = [
      {
        id: 'a1',
        actorId: 'uuid-admin-1',
        targetId: 'uuid-user-1',
        action: 'BLOCK_USER',
        ip: '127.0.0.1',
        userAgent: 'jest',
        createdAt: new Date('2024-06-01T12:00:00.000Z'),
      },
    ];
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue(rows);

    const res = await request(app)
      .get('/audit-log?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe('BLOCK_USER');
    expect(res.body.meta.total).toBe(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalled();
  });

  it('403 — обычный пользователь', async () => {
    const userToken = signAccess('uuid-user-1', 'user');
    const res = await request(app).get('/audit-log').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('401 — без токена', async () => {
    const res = await request(app).get('/audit-log');
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('200 — db и redis ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('ok');
    expect(res.body.redis).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('version');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('503 — деградация при ошибке БД', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('error');
  });
});

describe('GET /docs (non-production)', () => {
  it('отдаёт Swagger UI', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
