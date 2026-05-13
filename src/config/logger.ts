import pino from 'pino';

import { env } from '@/config/env';

const isDev = env.NODE_ENV === 'development';

function hasPinoPretty(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && hasPinoPretty()
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }
    : {}),
});
