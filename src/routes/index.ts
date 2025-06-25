import { Router } from 'express';
import { supremeRouter } from './supreme';

const router = Router();

router.use('/supreme', supremeRouter);

export { router as apiRouter };