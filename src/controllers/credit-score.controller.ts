import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.util.js';
import { creditScoreService } from '../services/credit-score.service.js';

export const createCreditScoreCalculatorVersion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await creditScoreService.createCalculatorVersion(req.body, req.userId);
    sendSuccess(res, result, 'Credit score calculator version created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getCreditScoreCalculatorVersions = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const versions = await creditScoreService.listCalculatorVersions();
    sendSuccess(res, versions, 'Credit score calculator versions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getActiveCreditScoreCalculatorVersion = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const version = await creditScoreService.getActiveCalculatorVersion();
    sendSuccess(res, version, 'Active credit score calculator retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const recalculateFarmerCreditScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmerId = req.params.farmerId!;
    const result = await creditScoreService.recalculateFarmerScoreManually(farmerId, req.userId);
    sendSuccess(res, result, 'Farmer credit score recalculated successfully');
  } catch (error) {
    next(error);
  }
};

export const getFarmerLatestCreditScore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmerId = req.params.farmerId!;
    const score = await creditScoreService.getLatestFarmerScore(farmerId);
    sendSuccess(res, score, 'Farmer latest credit score retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getFarmerCreditScoreHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmerId = req.params.farmerId!;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const history = await creditScoreService.getFarmerScoreHistory(farmerId, limit);
    sendSuccess(res, history, 'Farmer credit score history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

