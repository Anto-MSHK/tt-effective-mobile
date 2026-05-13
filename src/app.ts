import '@/types/express-augmentation';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { env } from '@/config/env';
import { errorHandler } from '@/middlewares/error-handler';
import { createRateLimiter } from '@/middlewares/rate-limiter';
import { requestId } from '@/middlewares/request-id';
import { authRouter } from '@/modules/auth/auth.router';
import { usersRouter } from '@/modules/users/users.router';

/**
 * Express application factory.
 */
export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'Retry-After'],
    }),
  );

  app.use(requestId);
  app.use(express.json());

  app.use('/auth', createRateLimiter(), authRouter);
  app.use('/users', usersRouter);

  app.get('/', (_req, res) => {
    res.json({ service: 'user-management-service', status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
