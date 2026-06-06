import { Router } from 'express';
import {
  createCreditScoreCalculatorVersion,
  getActiveCreditScoreCalculatorVersion,
  getCreditScoreCalculatorVersions,
  getFarmerCreditScoreHistory,
  getFarmerLatestCreditScore,
  recalculateFarmerCreditScore,
} from '../controllers/credit-score.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

router.get('/calculators', authenticate, authorizeAdmin, getCreditScoreCalculatorVersions);
router.get('/calculators/active', authenticate, authorizeAdmin, getActiveCreditScoreCalculatorVersion);
router.post('/calculators', authenticate, authorizeAdmin, createCreditScoreCalculatorVersion);

router.post(
  '/farmers/:farmerId/recalculate',
  authenticate,
  authorizeAdmin,
  validateParam('farmerId', 'Farmer ID is required'),
  recalculateFarmerCreditScore
);
router.get(
  '/farmers/:farmerId/latest',
  authenticate,
  authorizeAdmin,
  validateParam('farmerId', 'Farmer ID is required'),
  getFarmerLatestCreditScore
);
router.get(
  '/farmers/:farmerId/history',
  authenticate,
  authorizeAdmin,
  validateParam('farmerId', 'Farmer ID is required'),
  getFarmerCreditScoreHistory
);

export default router;

