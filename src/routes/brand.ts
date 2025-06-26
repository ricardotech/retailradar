import { Router } from 'express';
import { BrandController } from '@/controllers/BrandController';
import { BrandService } from '@/services/BrandService';
import { AdapterManager } from '@/services/AdapterManager';
import { ProductRepository } from '@/repositories/ProductRepository';
import { RapidApiAdapter, OfficialStockXAdapter, PuppeteerAdapter } from '@/adapters';
import { AppDataSource } from '@/config/database';
import { validateQuery } from '@/middleware/validation';
import { BrandProductsQuerySchema } from '@/utils/validation-schemas';

const router = Router();

const rapidApiAdapter = new RapidApiAdapter(
  process.env['RAPIDAPI_KEY'] || 'demo-key'
);

const officialAdapter = new OfficialStockXAdapter(
  process.env['STOCKX_API_KEY'] ?? 'demo-key'
);

const puppeteerAdapter = new PuppeteerAdapter();

const adapterManager = new AdapterManager([
  {
    adapter: puppeteerAdapter,
    name: 'Puppeteer Scraper',
    priority: 1,
    retryCount: 2,
    retryDelay: 5000
  },
  {
    adapter: officialAdapter,
    name: 'Official StockX API',
    priority: 2,
    retryCount: 3,
    retryDelay: 2000
  },
  {
    adapter: rapidApiAdapter,
    name: 'RapidAPI StockX',
    priority: 3,
    retryCount: 3,
    retryDelay: 2000
  }
]);

const productRepository = new ProductRepository(AppDataSource);
const brandService = new BrandService(adapterManager, productRepository);
const brandController = new BrandController(brandService);

router.get(
  '/:brandName/below-retail',
  validateQuery(BrandProductsQuerySchema),
  brandController.getBelowRetailProducts.bind(brandController)
);

router.get(
  '/:brandName/adapter-stats',
  brandController.getAdapterStats.bind(brandController)
);

router.get(
  '/:brandName/health',
  (req, res, next) => {
    brandController.getHealthStatus(req, res, next).catch(next);
  }
);

router.post(
  '/:brandName/reset-circuit-breakers',
  async (req, res, next) => {
    await brandController.resetCircuitBreakers(req, res, next);
  }
);

export { router as brandRouter };