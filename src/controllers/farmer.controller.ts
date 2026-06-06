import { Request, Response, NextFunction } from 'express';
import { farmerService } from '../services/farmer.service.js';
import { retailerService } from '../services/retailer.service.js';
import { creditScoreService } from '../services/credit-score.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';

/**
 * Farmer Controller
 * Handles all farmer-related HTTP requests
 */

/**
 * Get all farmers
 * GET /api/farmers
 */
export const getAllFarmers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // Optional query parameter to include populated details
    const includeDetails = req.query.details === 'true';

    const farmers = await farmerService.getAllFarmers(includeDetails);

    sendSuccess(res, farmers, 'Farmers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all farmers with pagination
 * GET /api/farmers/paginated
 */
export const getPaginatedFarmers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || Number(req.query.pageNumber) || 1;
    const limit = Number(req.query.limit) || Number(req.query.pageSize) || 10;
    const keyword = req.query.keyword as string | undefined;

    const result = await farmerService.getFarmersPaginated(page, limit, keyword);
    sendSuccess(res, result, 'Farmers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer by ID
 * GET /api/farmers/:id
 */
export const getFarmer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // farmerId is guaranteed by validateParam middleware
    const farmerId = req.params.id!;

    const includeDetails = req.query.details === 'true';
    const farmer = await farmerService.getFarmerById(farmerId, includeDetails);

    if (!farmer) {
      throw new BadRequestError('Farmer not found');
    }

    sendSuccess(res, farmer, 'Farmer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmers by agent user ID
 * GET /api/farmers/agent/:agentUserId
 */
export const getFarmersByAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // agentUserId is guaranteed by validateParam middleware
    const agentUserId = req.params.agentUserId!;

    const farmers = await farmerService.getFarmersByAgentUserId(agentUserId);

    sendSuccess(res, farmers, 'Farmers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmers by retailer ID
 * GET /api/farmers/retailer/:retailerId
 */
export const getFarmersByRetailer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // retailerId is guaranteed by validateParam middleware
    const retailerId = req.params.retailerId!;

    const farmers = await farmerService.getFarmersByRetailerId(retailerId);

    sendSuccess(res, farmers, 'Farmers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmers for the current logged-in retailer
 * GET /api/farmers/my-farmers or GET /api/farmers/retailer
 */
export const getFarmersForCurrentRetailer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    // Support both 'page' and 'pageNumber' for mobile app compatibility
    const { page, pageNumber, limit, keyword } = req.query;

    const pageNum = pageNumber ? Number(pageNumber) : (page ? Number(page) : 1);
    const pageSize = limit ? Number(limit) : 10;
    const searchKeyword = keyword as string | undefined;

    // Get retailer to find their ID
    const retailer = await retailerService.getRetailerByUserId(userId);

    if (!retailer) {
      throw new BadRequestError('Retailer profile not found');
    }

    const farmers = await farmerService.getFarmersByRetailerUserId(
      userId,
      pageNum,
      pageSize,
      searchKeyword
    );

    sendSuccess(res, farmers, 'Farmers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a farmer by retailer
 * POST /api/farmers
 */
export const createFarmerByRetailer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const farmerData = req.body;

    // Get retailer info
    const retailer = await retailerService.getRetailerByUserId(userId);

    // Generate farmer ID
    const farmerId = farmerData.farmerId ||
      `${farmerData.firstName?.toLowerCase()}_${farmerData.lastName?.toLowerCase()}_${Date.now()}`;

    // Build farmer data with retailer association
    const createData = {
      ...farmerData,
      farmerId,
      retailerId: userId,
      retailer_id: retailer?._id,
      addedByType: 'retailer',
      addedById: userId,
      // Legacy field for backward compatibility
      name: `${farmerData.firstName || ''} ${farmerData.lastName || ''}`.trim(),
    };

    const farmer = await farmerService.createFarmer(createData);

    try {
      await creditScoreService.calculateAndStoreFarmerScore({
        farmerId: farmer._id.toString(),
        reason: 'farmer_create',
        responseObject: (farmerData || {}) as Record<string, unknown>,
        triggeredBy: userId,
      });
    } catch (scoreError: any) {
      logger.error('Failed to calculate credit score after farmer direct creation', {
        farmerId: farmer._id.toString(),
        error: scoreError.message,
      });
    }

    logger.info('Farmer created by retailer', {
      farmerId: farmer._id.toString(),
      retailerUserId: userId,
    });

    sendSuccess(res, farmer, 'Farmer created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update farmer by ID
 * PUT /api/farmers/:id
 */
export const updateFarmerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const farmerId = req.params.id!;
    const updateData = req.body;

    // Get existing farmer to verify ownership
    const existingFarmer = await farmerService.getFarmerById(farmerId);

    if (!existingFarmer) {
      throw new NotFoundError('Farmer not found');
    }

    // Check if the farmer belongs to this retailer
    const retailerIdStr = (existingFarmer as any).retailerId?.toString();
    if (retailerIdStr && retailerIdStr !== userId) {
      throw new ForbiddenError('You can only update your own farmers');
    }

    const farmer = await farmerService.updateFarmerById(farmerId, updateData);

    if (farmer) {
      try {
        await creditScoreService.calculateAndStoreFarmerScore({
          farmerId: farmer._id.toString(),
          reason: 'farmer_update',
          responseObject: (updateData || {}) as Record<string, unknown>,
          triggeredBy: userId,
        });
      } catch (scoreError: any) {
        logger.error('Failed to calculate credit score after farmer direct update', {
          farmerId: farmerId,
          error: scoreError.message,
        });
      }
    }

    logger.info('Farmer updated', {
      farmerId,
      updatedBy: userId,
    });

    sendSuccess(res, farmer, 'Farmer updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete farmer by ID
 * DELETE /api/farmers/:id
 */
export const deleteFarmerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const farmerId = req.params.id!;

    // Get existing farmer to verify ownership
    const existingFarmer = await farmerService.getFarmerById(farmerId);

    if (!existingFarmer) {
      throw new NotFoundError('Farmer not found');
    }

    // Check if the farmer belongs to this retailer
    const retailerIdStr = (existingFarmer as any).retailerId?.toString();
    if (retailerIdStr && retailerIdStr !== userId) {
      throw new ForbiddenError('You can only delete your own farmers');
    }

    await farmerService.deleteFarmerById(farmerId);

    logger.info('Farmer deleted', {
      farmerId,
      deletedBy: userId,
    });

    sendSuccess(res, { _id: farmerId }, 'Farmer deleted successfully');
  } catch (error) {
    next(error);
  }
};
