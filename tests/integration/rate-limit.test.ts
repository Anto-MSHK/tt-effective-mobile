import request from 'supertest';

jest.mock('@/db/prisma', () => require('../__mocks__/prisma'));

const redisMock = {
  pipeline: jest.fn(),
  publish: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue('OK'),
};

jest.mock('@/db/redis', () => ({ redis: redisMock }));

import { createApp } from '@/app';

const app = createApp();

function makePipeline(cardCount: number) {
  return {
    zremrangebyscore: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    pexpire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, cardCount],
      [null, 1],
    ]),
  };
}

describe('Rate limiter', () => {
  it('returns 429 when request count exceeds RATE_LIMIT_MAX', async () => {
    const pipeline = makePipeline(99);
    redisMock.pipeline.mockReturnValue(pipeline);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'x@x.com', password: 'Admin1!Strong' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeTruthy();
  });

  it('allows request when count is within limit', async () => {
    const pipeline = makePipeline(1);
    redisMock.pipeline.mockReturnValue(pipeline);

    const res = await request(app)
      .post('/auth/login')
      .send({});

    expect(res.status).not.toBe(429);
  });

  it('allows request when redis fails (fail-open)', async () => {
    redisMock.pipeline.mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('redis down')),
    });

    const res = await request(app)
      .post('/auth/login')
      .send({});

    expect(res.status).not.toBe(429);
  });
});
