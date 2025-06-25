import { Router } from 'express';
import { SupremeController } from '@/controllers/SupremeController';
import { SupremeService } from '@/services/SupremeService';
import { RapidApiAdapter } from '@/adapters';
import { validateQuery } from '@/middleware/validation';
import { SupremeProductsQuerySchema } from '@/utils/validation-schemas';

const router = Router();

const rapidApiAdapter = new RapidApiAdapter(
  process.env.RAPIDAPI_KEY || 'demo-key'
);

const supremeService = new SupremeService([rapidApiAdapter]);
const supremeController = new SupremeController(supremeService);

router.get(
  '/below-retail',
  validateQuery(SupremeProductsQuerySchema),
  supremeController.getBelowRetailProducts.bind(supremeController)
);

export { router as supremeRouter };