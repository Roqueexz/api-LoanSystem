import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const transport = isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(transport && { transport }),
  base: {
    service: 'loansystem-api',
    env: process.env.NODE_ENV || 'development',
  },
});

export default logger;