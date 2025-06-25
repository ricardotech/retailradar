import { logger } from './logger';

beforeAll(async () => {
  logger.info('Starting test suite');
});

afterAll(async () => {
  logger.info('Test suite completed');
});