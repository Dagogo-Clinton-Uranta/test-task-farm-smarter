import { Request, Response, NextFunction } from 'express';
import { formConfigService } from '../services/form-config.service.js';
import { sendSuccess } from '../utils/response.util.js';

/**
 * Form Config Controller
 * Handles form configuration endpoints
 */

/**
 * Get farmer form required fields
 * GET /api/form-config/farmer-required-fields
 */
export const getFarmerFormRequiredFields = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const requiredFields = formConfigService.getFarmerFormRequiredFields();
    sendSuccess(res, { requiredFields }, 'Farmer form required fields retrieved successfully');
  } catch (error) {
    next(error);
  }
};
