import { Router } from 'express';
import {
  createFarm,
  getFarmReadingsSummaryById,
  getFarms,
  updateFarmReadingsById,
} from '../controllers/farm.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createFarmSchema } from '../middlewares/validation.middleware.js';

const router = Router();

router.post('/', validate(createFarmSchema), createFarm);
router.get('/', getFarms);
router.get('/:farm_id/readings/summary', getFarmReadingsSummaryById);
router.post('/:farm_id/readings', updateFarmReadingsById);

export default router;
