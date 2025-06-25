import { createApp } from './app';
import { logger } from '@/config/logger';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});