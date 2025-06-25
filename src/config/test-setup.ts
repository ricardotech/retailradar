import { logger } from './logger';

beforeAll(() => {
  logger.info('Starting test suite');
});

afterAll(() => {
  logger.info('Test suite completed');
});