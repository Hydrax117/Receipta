/**
 * requestLogger.ts — HTTP request-logging middleware.
 *
 * Attaches a unique requestId to every incoming request and logs:
 *   - On receipt:   method, url, userAgent, ip
 *   - On finish:    statusCode, duration (ms)
 *
 * The requestId is also written to the X-Request-ID response header so
 * clients and load-balancers can correlate requests with log entries.
 *
 * Usage in app.ts:
 *   import { requestLogger } from './middleware/requestLogger';
 *   app.use(requestLogger);
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../logger';

// Extend Express Request so downstream handlers can read req.requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: ReturnType<typeof logger.child>;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();

  // Attach to request object so route handlers can log with the same context
  req.requestId = requestId;
  req.log = logger.child({ requestId });

  // Echo the ID back so clients / load-balancers can trace the call
  res.setHeader('X-Request-ID', requestId);

  const startAt = process.hrtime.bigint();

  req.log.info(
    {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'] ?? '',
      ip: req.ip,
    },
    'request received'
  );

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;

    const logFn =
      res.statusCode >= 500 ? req.log.error.bind(req.log)
      : res.statusCode >= 400 ? req.log.warn.bind(req.log)
      : req.log.info.bind(req.log);

    logFn(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: parseFloat(durationMs.toFixed(2)),
      },
      'request completed'
    );
  });

  next();
}
