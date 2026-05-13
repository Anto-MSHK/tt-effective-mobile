import bcrypt from 'bcrypt';
import request from 'supertest';

jest.mock('@/db/prisma', () => require('../__mocks__/prisma'));
jest.mock('@/db/redis', () => require('../__mocks__/redis'));

import { createApp } from '@/app';
import { prisma } from '../__mocks__/prisma';
import { signAccess } from '@/utils/token';

const app = createApp();

const validRegisterBody = {
  fullName: 'Alice Smith',
  email: 'alice@example.com',
  password: 'Admin1!Strong',
  dateOfBirth: '1995-08-20',
};

function makeDbUser(overrides = {}) {
  return {
    id: 'uuid-alice',
    fullName: 'Alice Smith',
    email: 'alice@example.com',
    passwordHash: '$2b$10$placeholder',
    role: 'user',
    isActive: true,
    dateOfBirth: new Date('1995-08-20'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /auth/register', () => {
  it('201 — creates a user and returns tokens', async () => {
    const user = makeDbUser();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const res = await request(app).post('/auth/register').send(validRegisterBody);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('400 — missing required field', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'x@x.com', password: 'Admin1!', dateOfBirth: '1990-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('422 — user under 18', async () => {
    const year = new Date().getFullYear() - 10;
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validRegisterBody, dateOfBirth: `${year}-01-01` });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('AGE_TOO_YOUNG');
  });

  it('400 — weak password rejected by Zod', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validRegisterBody, password: 'weak' });
    expect(res.status).toBe(400);
  });

  it('response contains requestId', async () => {
    const user = makeDbUser();
    prisma.user.create.mockResolvedValue(user);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const res = await request(app).post('/auth/register').send(validRegisterBody);
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('POST /auth/login', () => {
  it('200 — returns tokens for valid credentials', async () => {
    const hash = await bcrypt.hash('Admin1!Strong', 10);
    const user = makeDbUser({ passwordHash: hash });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'Admin1!Strong' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('401 — wrong password', async () => {
    const hash = await bcrypt.hash('Correct1!', 10);
    const user = makeDbUser({ passwordHash: hash });
    prisma.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'Wrong1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401 — unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'Admin1!' });
    expect(res.status).toBe(401);
  });

  it('403 — blocked account', async () => {
    const hash = await bcrypt.hash('Admin1!Strong', 10);
    const user = makeDbUser({ passwordHash: hash, isActive: false });
    prisma.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'Admin1!Strong' });
    expect(res.status).toBe(403);
  });

  it('400 — missing body', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('200 — rotates tokens', async () => {
    const user = makeDbUser();
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-old', userId: user.id, user,
    });
    prisma.$transaction.mockResolvedValue([{}, {}]);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-new' });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'old-plain-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe('old-plain-token');
  });

  it('401 — invalid refresh token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });
});

describe('Error handling', () => {
  it('400 — invalid JSON body triggers SyntaxError handler', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ bad json }');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Invalid JSON body');
  });
});

describe('POST /auth/logout', () => {
  it('204 — revokes refresh token', async () => {
    const user = makeDbUser();
    const accessToken = signAccess(user.id, 'user');
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-id', userId: user.id, user,
    });
    prisma.refreshToken.update.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: 'plain-rt' });

    expect(res.status).toBe(204);
  });

  it('401 — no Authorization header', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'tok' });
    expect(res.status).toBe(401);
  });
});
