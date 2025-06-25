import { Router } from 'express';
import { brandRouter } from './brand';

const router = Router();

router.use('/radar', brandRouter);

export { router as apiRouter };