import { Request, Response, NextFunction } from 'express';
import { retailerProductService } from '../services/retailer-product.service.js';
import { retailerService } from '../services/retailer.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';

/**
 * Transform product data before validation
 * Converts price to string, maps stockQuantity to quantity, and maps images to image
 */
export const transformProductData = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body) {
    // Convert price to string if it's a number
    if (typeof req.body.price === 'number') {
      req.body.price = req.body.price.toString();
    }

    // Map stockQuantity to quantity if quantity is not provided
    if (!req.body.quantity && req.body.stockQuantity !== undefined) {
      req.body.quantity = typeof req.body.stockQuantity === 'number'
        ? req.body.stockQuantity.toString()
        : String(req.body.stockQuantity);
    } else if (req.body.quantity && typeof req.body.quantity === 'number') {
      // Convert quantity to string if it's a number
      req.body.quantity = req.body.quantity.toString();
    }

    // Remove stockQuantity after mapping to avoid confusion
    if (req.body.stockQuantity) {
      delete req.body.stockQuantity;
    }

    // Map images array to image if image is not provided
    // The model requires 'image' (singular) but mobile app sends 'images' (array)
    if (!req.body.image && req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      req.body.image = req.body.images[0]; // Use first image as the primary image
    }
  }
  next();
};

/**
 * Retailer Product Controller
 * Handles all retailer product-related HTTP requests
 */

/**
 * Create a new product
 * POST /api/retailers/products
 */
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const productData = req.body; // Data already transformed by transformProductData middleware

    // Get retailer ID for linking
    const retailer = await retailerService.getRetailerByUserId(userId);
    const retailerId = retailer?._id?.toString();

    const product = await retailerProductService.createProduct(
      userId,
      productData,
      retailerId
    );

    logger.info('Product created', {
      productId: product._id.toString(),
      userId,
    });

    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const createOnboardingProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name, price, quantity } = req.body;

    const retailer = await retailerService.getRetailerByUserId(userId);
    const retailerId = retailer?._id?.toString();

    const product = await retailerProductService.createOnboardingProduct(
      userId,
      {
        name: String(name),
        price: String(price),
        quantity: String(quantity),
      },
      retailerId
    );

    logger.info('Onboarding product created', {
      productId: product._id.toString(),
      userId,
    });

    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get retailer's products with filtering and pagination
 * GET /api/retailers/products
 */
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { page, limit, category, status, search } = req.query;

    const result = await retailerProductService.getProductsByRetailerId(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
    });

    sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get product overview/statistics
 * GET /api/retailers/products/overview
 */
export const getProductOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const overview = await retailerProductService.getProductOverview(userId);

    sendSuccess(res, overview, 'Product overview retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single product by ID
 * GET /api/retailers/products/:id
 */
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const productId = req.params.id!;

    const product = await retailerProductService.getProductById(productId, userId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    sendSuccess(res, product, 'Product retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update a product
 * PUT /api/retailers/products/:id
 */
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const productId = req.params.id!;
    const updateData = req.body;

    // Verify product exists and belongs to retailer
    const existingProduct = await retailerProductService.getProductById(productId, userId);
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const product = await retailerProductService.updateProduct(
      productId,
      userId,
      updateData
    );

    logger.info('Product updated', {
      productId,
      userId,
    });

    sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product (soft delete - sets status to archived)
 * DELETE /api/retailers/products/:id
 */
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const productId = req.params.id!;

    // Verify product exists and belongs to retailer
    const existingProduct = await retailerProductService.getProductById(productId, userId);
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const product = await retailerProductService.deleteProduct(productId, userId);

    logger.info('Product deleted', {
      productId,
      userId,
    });

    sendSuccess(res, product, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};
