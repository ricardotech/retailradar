import pino from 'pino';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label: string): { level: string } => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    error: pino.stdSerializers.err,
  },
});

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  req.log = logger.child({
    requestId: req.headers['x-request-id'] || Date.now().toString(),
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    req.log[level]({
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