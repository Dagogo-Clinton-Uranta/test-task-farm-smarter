import { Document, Types } from 'mongoose';

/**
 * RetailerProduct Interface matching EXACT production database schema
 * Collection: test.retailerproducts
 *
 * Relationships:
 * - retailer_user_id -> userdbs._id (M:1)
 * - retailer_id -> retailers._id (M:1)
 *
 * ⚠️ CRITICAL NOTES:
 * - price is STRING not number!
 * - quantity is STRING not number!
 */

export interface IRetailerProduct extends Document {
  _id: Types.ObjectId;

  // Required fields
  name: string;
  price: string;               // ⚠️ STRING not number!
  quantity: string;            // ⚠️ STRING not number!
  category: string;
  description: string;
  image: string;
  unit: string;
  retailer_user_id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Optional fields
  images?: string[];           // Array of image URLs
  imageUrls?: string[];        // Alternate field for images
  status?: string;             // 'active' | 'draft' | 'archived'
  isAvailableOnCredit?: boolean;
  availableOnCredit?: boolean; // Alternate field
  retailer_id?: Types.ObjectId;

  // Metadata
  __v?: number;
}

/**
 * Product creation input
 */
export interface IRetailerProductCreateInput {
  name: string;
  price: string;               // ⚠️ Must be string
  quantity: string;            // ⚠️ Must be string
  category: string;
  description: string;
  unit: string;
  image?: string;
  images?: string[];
  status?: string;
  isAvailableOnCredit?: boolean;
}

export interface IOnboardingRetailerProductCreateInput {
  name: string;
  price: string;
  quantity: string;
}

/**
 * Product update input
 */
export interface IRetailerProductUpdateInput {
  name?: string;
  price?: string;
  quantity?: string;
  category?: string;
  description?: string;
  unit?: string;
  image?: string;
  images?: string[];
  status?: string;
  isAvailableOnCredit?: boolean;
}

/**
 * Product response (safe to return to client)
 */
export interface IRetailerProductResponse {
  _id: string;
  name: string;
  price: string;
  quantity: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
  unit: string;
  status?: string;
  isAvailableOnCredit?: boolean;
  retailer_user_id: string;
  retailer_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product overview/statistics
 */
export interface IProductOverview {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  categoryCounts: Record<string, number>;
}

/**
 * Product query filters
 */
export interface IProductQueryFilters {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated products response
 */
export interface IPaginatedProducts {
  products: IRetailerProductResponse[];
  page: number;
  pages: number;
  total: number;
}
