import '@/types/express-augmentation';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from '@/config/env';
import { buildSwaggerSpec } from '@/config/swagger';
import { errorHandler } from '@/middlewares/error-handler';
import { createRateLimiter } from '@/middlewares/rate-limiter';
import { requestId } from '@/middlewares/request-id';
import { auditRouter } from '@/modules/audit/audit.router';
import { authRouter } from '@/modules/auth/auth.router';
import { healthRouter } from '@/modules/health/health.router';
import { usersRouter } from '@/modules/users/users.router';

/**
 * Express application factory.
 */
export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet(env.NODE_ENV === 'production' ? {} : { contentSecurityPolicy: false }));
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
  app.use('/audit-log', auditRouter);
  app.use('/health', healthRouter);

  app.get('/', (_req, res) => {
    res.json({ service: 'user-management-service', status: 'ok' });
  });

  if (env.NODE_ENV !== 'production') {
    const swaggerSpec = buildSwaggerSpec();
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use(errorHandler);

  return app;
}
