import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@/config/logger';
import { errorHandler } from '@/middleware/error-handler';
import { apiRouter } from '@/routes';

export const createApp = (): express.Application => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  app.get('/healthz', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api/v1', apiRouter);

  app.use(errorHandler);

  return app;
};