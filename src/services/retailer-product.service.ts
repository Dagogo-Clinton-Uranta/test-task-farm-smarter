import mongoose from 'mongoose';
import { RetailerProduct } from '../models/retailer-product.model.js';
import {
  IRetailerProduct,
  IRetailerProductCreateInput,
  IOnboardingRetailerProductCreateInput,
  IRetailerProductUpdateInput,
  IProductOverview,
  IProductQueryFilters,
  IPaginatedProducts,
} from '../interfaces/retailer-product.interface.js';
import { logger } from '../utils/logger.js';

/**
 * Retailer Product Service
 * Handles all retailer product-related business logic
 */

/**
 * Create a new product
 */
export const createProduct = async (
  retailerUserId: string,
  input: IRetailerProductCreateInput,
  retailerId?: string
): Promise<IRetailerProduct> => {
  const product = new RetailerProduct({
    ...input,
    retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
    ...(retailerId && { retailer_id: new mongoose.Types.ObjectId(retailerId) }),
  });

  const savedProduct = await product.save();

  logger.info('Product created', {
    productId: savedProduct._id.toString(),
    retailerUserId,
    name: input.name,
  });

  return savedProduct;
};

export const createOnboardingProduct = async (
  retailerUserId: string,
  input: IOnboardingRetailerProductCreateInput,
  retailerId?: string
): Promise<IRetailerProduct> => {
  return createProduct(
    retailerUserId,
    {
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      category: 'onboarding',
      description: input.name,
      unit: 'unit',
      image: 'onboarding-product-placeholder',
      status: 'active',
      isAvailableOnCredit: false,
    },
    retailerId
  );
};

/**
 * Get products by retailer user ID with filtering and pagination
 */
export const getProductsByRetailerId = async (
  retailerUserId: string,
  filters: IProductQueryFilters = {}
): Promise<IPaginatedProducts> => {
  const { category, status, search, page = 1, limit = 10 } = filters;

  // Build query
  const query: any = {
    retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
  };

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Get total count
  const total = await RetailerProduct.countDocuments(query);

  // Get products with pagination
  const products = await RetailerProduct.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    products: products as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

/**
 * Get product by ID
 */
export const getProductById = async (
  productId: string,
  retailerUserId?: string
): Promise<IRetailerProduct | null> => {
  const query: any = { _id: productId };

  // If retailerUserId provided, ensure product belongs to that retailer
  if (retailerUserId) {
    query.retailer_user_id = new mongoose.Types.ObjectId(retailerUserId);
  }

  return await RetailerProduct.findOne(query).exec();
};

/**
 * Update product
 */
export const updateProduct = async (
  productId: string,
  retailerUserId: string,
  updateData: IRetailerProductUpdateInput
): Promise<IRetailerProduct | null> => {
  const product = await RetailerProduct.findOneAndUpdate(
    {
      _id: productId,
      retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
    },
    { $set: updateData },
    { new: true }
  ).exec();

  if (product) {
    logger.info('Product updated', {
      productId,
      retailerUserId,
    });
  }

  return product;
};

/**
 * Delete product (soft delete by setting status to archived)
 */
export const deleteProduct = async (
  productId: string,
  retailerUserId: string
): Promise<IRetailerProduct | null> => {
  const product = await RetailerProduct.findOneAndUpdate(
    {
      _id: productId,
      retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
    },
    { $set: { status: 'archived' } },
    { new: true }
  ).exec();

  if (product) {
    logger.info('Product archived', {
      productId,
      retailerUserId,
    });
  }

  return product;
};

/**
 * Hard delete product
 */
export const hardDeleteProduct = async (
  productId: string,
  retailerUserId: string
): Promise<boolean> => {
  const result = await RetailerProduct.deleteOne({
    _id: productId,
    retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
  }).exec();

  if (result.deletedCount && result.deletedCount > 0) {
    logger.info('Product permanently deleted', {
      productId,
      retailerUserId,
    });
    return true;
  }

  return false;
};

/**
 * Get product overview/statistics for a retailer
 */
export const getProductOverview = async (retailerUserId: string): Promise<IProductOverview> => {
  const pipeline = [
    {
      $match: {
        retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
      },
    },
    {
      $facet: {
        // Total products count
        totalProducts: [{ $count: 'count' }],

        // Products by status
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],

        // Products by category
        byCategory: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ];

  const results = await RetailerProduct.aggregate(pipeline);
  const data = results[0];

  // Extract counts
  const totalProducts = data.totalProducts[0]?.count || 0;

  // Build status counts
  const statusCounts: Record<string, number> = {};
  data.byStatus.forEach((item: { _id: string; count: number }) => {
    statusCounts[item._id || 'unknown'] = item.count;
  });

  // Build category counts
  const categoryCounts: Record<string, number> = {};
  data.byCategory.forEach((item: { _id: string; count: number }) => {
    categoryCounts[item._id || 'uncategorized'] = item.count;
  });

  return {
    totalProducts,
    activeProducts: statusCounts['active'] || 0,
    draftProducts: statusCounts['draft'] || 0,
    archivedProducts: statusCounts['archived'] || 0,
    categoryCounts,
  };
};

/**
 * Get all products (for admin)
 */
export const getAllProducts = async (
  page: number = 1,
  limit: number = 10
): Promise<IPaginatedProducts> => {
  const total = await RetailerProduct.countDocuments();
  const products = await RetailerProduct.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('retailer_user_id', 'firstName lastName email')
    .exec();

  return {
    products: products as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

// Export service object
export const retailerProductService = {
  createProduct,
  createOnboardingProduct,
  getProductsByRetailerId,
  getProductById,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  getProductOverview,
  getAllProducts,
};
