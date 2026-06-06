import mongoose, { Schema, Model } from 'mongoose';
import { IRetailerProduct } from '../interfaces/retailer-product.interface.js';

/**
 * RetailerProduct Schema matching EXACT production database
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

type RetailerProductModel = Model<IRetailerProduct>;

const retailerProductSchema = new Schema<IRetailerProduct, RetailerProductModel>(
  {
    // Required fields
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String, // ⚠️ STRING not number!
      required: true,
    },
    quantity: {
      type: String, // ⚠️ STRING not number!
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    retailer_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Optional fields
    images: {
      type: [String],
      default: [],
    },
    imageUrls: {
      type: [String], // Alternate field for images
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
    },
    isAvailableOnCredit: {
      type: Boolean,
      default: false,
    },
    availableOnCredit: {
      type: Boolean, // Alternate field
    },
    retailer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Retailer',
    },
  },
  {
    timestamps: true,
    collection: 'retailerproducts', // Exact collection name from production
    strict: false, // Allow flexible schema for production compatibility
  }
);

// Indexes for performance
retailerProductSchema.index({ retailer_user_id: 1 });
retailerProductSchema.index({ retailer_id: 1 });
retailerProductSchema.index({ category: 1 });
retailerProductSchema.index({ status: 1 });
retailerProductSchema.index({ name: 'text' }); // Text index for search
retailerProductSchema.index({ createdAt: -1 });

// Compound indexes for common queries
retailerProductSchema.index({ retailer_user_id: 1, status: 1 });
retailerProductSchema.index({ retailer_user_id: 1, category: 1 });

// Create and export model
export const RetailerProduct = mongoose.model<IRetailerProduct, RetailerProductModel>(
  'RetailerProduct',
  retailerProductSchema
);
