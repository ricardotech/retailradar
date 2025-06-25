import { Router } from 'express';
import { SupremeController } from '@/controllers/SupremeController';
import { SupremeService } from '@/services/SupremeService';
import { AdapterManager } from '@/services/AdapterManager';
import { ProductRepository } from '@/repositories/ProductRepository';
import { RapidApiAdapter, OfficialStockXAdapter, PuppeteerAdapter } from '@/adapters';
import { AppDataSource } from '@/config/database';
import { validateQuery } from '@/middleware/validation';
import { SupremeProductsQuerySchema } from '@/utils/validation-schemas';

const router = Router();

const rapidApiAdapter = new RapidApiAdapter(
  process.env['RAPIDAPI_KEY'] || 'demo-key'
);

const officialAdapter = new OfficialStockXAdapter(
  process.env['STOCKX_API_KEY'] || 'demo-key'
);

const puppeteerAdapter = new PuppeteerAdapter();

const adapterManager = new AdapterManager([
  {
    adapter: officialAdapter,
    name: 'Official StockX API',
    priority: 1,
    retryCount: 3,
    retryDelay: 2000
  },
  {
    adapter: rapidApiAdapter,
    name: 'RapidAPI StockX',
    priority: 2,
    retryCount: 3,
    retryDelay: 2000
  },
  {
    adapter: puppeteerAdapter,
    name: 'Puppeteer Scraper',
    priority: 3,
    retryCount: 2,
    retryDelay: 5000
  }
]);

const productRepository = new ProductRepository(AppDataSource);
const supremeService = new SupremeService(adapterManager, productRepository);
const supremeController = new SupremeController(supremeService);

router.get(
  '/below-retail',
  validateQuery(SupremeProductsQuerySchema),
  supremeController.getBelowRetailProducts.bind(supremeController)
);

router.get(
  '/adapter-stats',
  supremeController.getAdapterStats.bind(supremeController)
);

router.get(
  '/health',
  supremeController.getHealthStatus.bind(supremeController)
);

router.post(
  '/reset-circuit-breakers',
  supremeController.resetCircuitBreakers.bind(supremeController)
);

export { router as supremeRouter };