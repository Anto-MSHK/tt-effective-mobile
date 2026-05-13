import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/db/prisma.ts',
    '!src/db/redis.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { paths: { '@/*': ['src/*'] } } }],
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
};

export default config;
