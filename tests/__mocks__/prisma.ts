const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  refreshToken: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    count: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([1]),
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

export const prisma = prismaMock;
