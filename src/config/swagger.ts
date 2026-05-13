import { join } from 'node:path';

import swaggerJSDoc from 'swagger-jsdoc';

import { env } from '@/config/env';

const servers =
  env.NODE_ENV === 'production'
    ? [{ url: '/', description: 'Current host' }]
    : [
        { url: 'http://localhost:3000', description: 'Local' },
        { url: '/', description: 'Relative (same host)' },
      ];

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'User Management Service',
    version: '1.0.0',
    description: 'Effective Mobile — user management API (PRD)',
  },
  tags: [
    { name: 'Auth', description: 'Регистрация и сессии' },
    { name: 'Users', description: 'Пользователи' },
    { name: 'Audit', description: 'Журнал аудита (admin)' },
    { name: 'Health', description: 'Готовность сервиса' },
  ],
  servers,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [],
};

/**
 * OpenAPI из JSDoc в `src/modules/**` (dev: `.ts`, prod: скомпилированные `.js`).
 */
export function buildSwaggerSpec(): object {
  const modulesDir = join(__dirname, '../modules');
  return swaggerJSDoc({
    definition,
    apis: [join(modulesDir, '**/*.ts'), join(modulesDir, '**/*.js')],
  });
}
