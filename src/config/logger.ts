import pino, { Logger } from 'pino';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env['NODE_ENV'] === 'development';

export const logger: Logger = pino(
  isDevelopment
    ? {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        formatters: {
          level: (label: string): { level: string } => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
          error: pino.stdSerializers.err,
        },
      }
    : {
        level: process.env['LOG_LEVEL'] ?? 'info',
        formatters: {
          level: (label: string): { level: string } => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
          error: pino.stdSerializers.err,
        },
      }
);

export interface RequestWithLogger extends Request {
  log: Logger;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  (req as RequestWithLogger).log = logger.child({
    requestId: req.headers['x-request-id'] ?? Date.now().toString(),
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    (req as RequestWithLogger).log[level]({
      req: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      },
      res: {
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
      },
      duration,
    }, `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
};