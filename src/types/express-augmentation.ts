import type { Logger } from 'pino';

export type AuthUser = {
  sub: string;
  role: 'admin' | 'user';
};

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      requestId: string;
      log: Logger;
      user?: AuthUser;
    }
  }
}

export {};
