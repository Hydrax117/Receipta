/**
 * logger.ts — application-wide structured logger.
 *
 * In development (NODE_ENV !== 'production') logs are pretty-printed to
 * stdout via pino-pretty so they are readable in a local terminal.
 *
 * In production logs are written as newline-delimited JSON, ready to be
 * ingested by CloudWatch, Datadog, Loki, or any other structured log aggregator.
 *
 * Usage
 * -----
 *   import logger from './logger';
 *   logger.info({ merchantId }, 'Merchant registered');
 *   logger.error({ err, requestId }, 'Receipt creation failed');
 *
 * Child loggers
 * -------------
 * Bind a requestId (or any other context) for the lifetime of a request:
 *
 *   const reqLogger = logger.child({ requestId });
 *   reqLogger.info('Processing payment');
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined; // JSON to stdout in production

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    // Always include timestamp in the JSON payload
    timestamp: pino.stdTimeFunctions.isoTime,
    // Serialise Error objects into { message, stack, type }
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    // Base fields present on every log line
    base: {
      service: 'receipta-backend',
      env: process.env.NODE_ENV ?? 'development',
    },
  },
  transport ? pino.transport(transport) : undefined
);

export default logger;
