import mongoose, { Schema, Model } from 'mongoose';
import { IControls } from '../interfaces/controls.interface.js';

/**
 * Controls Schema
 * Collection: controls
 *
 * Supports:
 * - credit_tiers
 * - credit_caps
 * - interest_rates
 *
 * ⚠️ All fields are optional so the schema
 * can support multiple control document types
 */

interface IControlsMethods {
  // Add instance methods here if needed
}

type ControlsModel = Model<IControls, object, IControlsMethods>;

const tierRangeSchema = new Schema(
  {
    min: Number,
    max: Number,
  },
  { _id: false }
);

const tierGroupSchema = new Schema(
  {
    gold: {
      type: tierRangeSchema,
    },
    silver: {
      type: tierRangeSchema,
    },
    bronze: {
      type: tierRangeSchema,
    },
    basic: {
      type: tierRangeSchema,
    },
  },
  { _id: false }
);

const creditCapSchema = new Schema(
  {
    maxCreditLimit: Number,
    maxSingleTransaction: Number,
  },
  { _id: false }
);

const creditCapGroupSchema = new Schema(
  {
    gold: {
      type: creditCapSchema,
    },
    silver: {
      type: creditCapSchema,
    },
    bronze: {
      type: creditCapSchema,
    },
    basic: {
      type: creditCapSchema,
    },
  },
  { _id: false }
);

const interestRateSchema = new Schema(
  {
    rate: Number,
  },
  { _id: false }
);

const controlsSchema = new Schema<IControls, ControlsModel, IControlsMethods>(
  {
    /**
     * Common
     */

    name: {
      type: String,
      enum: ['credit_tiers', 'credit_caps', 'interest_rates'],
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    /**
     * CREDIT TIERS
     */

    farmers: {
      type:  Schema.Types.Mixed,
    },

    retailers: {
      type: Schema.Types.Mixed,
    },

    /**
     * INTEREST RATES
     */

    farmersInterestRate: {
      type: interestRateSchema,
    },

    retailersInterestRate: {
      type: interestRateSchema,
    },

    /**
     * CREDIT CAPS
     */

    retailersCreditCaps: {
      type: creditCapGroupSchema,
    },
  },
  {
    strict:false,
    timestamps: true,
    collection: 'controls',
  }
);

// Indexes
controlsSchema.index({ name: 1 });
controlsSchema.index({ updatedAt: -1 });

// Create and export model
export const Controls = mongoose.model<IControls, ControlsModel>(
  'Controls',
  controlsSchema
);