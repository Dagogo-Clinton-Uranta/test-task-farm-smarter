import { Request, Response, NextFunction } from 'express';
import { backgroundJobService } from '../services/background-job.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { authorizeAdmin } from '../middlewares/auth.middleware.js';

/**
 * Form Data Extraction Controller
 * Handles manual triggers for form data extraction
 */

/**
 * Manually trigger farmer data extraction
 * POST /api/form-extraction/trigger
 */
export const triggerFarmerExtraction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await backgroundJobService.triggerFarmerExtraction();
    
    sendSuccess(res, stats, 'Farmer data extraction completed successfully');
  } catch (error) {
    next(error);
  }
};
