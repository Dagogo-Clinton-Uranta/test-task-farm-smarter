import mongoose, { Schema, Model } from 'mongoose';
import { IRetailer } from '../interfaces/retailer.interface.js';

/**
 * Retailer Schema matching EXACT production database
 * Collection: test.retailers
 *
 * Relationships:
 * - retailer_user_id -> userdbs._id (1:1)
 */

type RetailerModel = Model<IRetailer>;

const retailerSchema = new Schema<IRetailer, RetailerModel>(
  {
    // Required fields
    retailer_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },

    // Business info
    companyName: String,
    companyEmail: String,
    companyAddress: String,
    businessName: String,
    businessAddress: String,
    businessTown: String,
    businessNearestLandmark: String,
    businessGps: String,
    businessAddressMode: String,
    businessAddressSameAsHome: Boolean,
    storeName: String,
    cacRegistered: String,
    cacRegistrationNumber: String,
    businessChannel: String,
    contactPerson: String,

    // Personal info
    firstName: String,
    lastName: String,
    middleName: String,
    email: String,
    phone: String,
    gender: String,
    dateOfBirth: String,
    nationality: String,

    // Location info
    address: String,
    state: String,
    localGovernment: String,
    nearestLandmark: String,
    country: String,
    stateOfOrigin: String,
    localGovernmentOfOrigin: String,
    currentState: String,
    currentLocalGovernment: String,
    location: String,
    gps: String,
    homeAddressMode: String,

    // Shop info
    shopSize: String,
    shopOwnership: String,
    yearsInBusiness: String,

    // ID & Documents
    meansOfId: String,
    idNumber: String,
    nin: String,
    idDocument: {
      type: Schema.Types.Mixed, // string | null
    },
    proofOfAddress: {
      type: Schema.Types.Mixed, // string | null
    },
    utilityBill: {
      type: Schema.Types.Mixed, // string | null
    },
    shopPhotos: {
      type: Schema.Types.Mixed, // string | null
    },
    photoUrl: String,
    photoIdIndUrl: String,
    photoOfShopIndUrl: String,
    utilityBillIndUrl: String,

    // Utility info
    hasBvn: String,
    bvn: String,
    hasBusinessBankAccount: String,
    businessAccountType: String,
    accountNumber: String,
    bankName: String,
    meterNumber: String,
    utilityType: String,

    // Status & Financial
    is_active: {
      type: Boolean,
      default: true,
    },
    onboardingCurrentStep: {
      type: Number,
      default: 1,
    },
    onboardingCompletedSteps: {
      type: [Number],
      default: [],
    },
    onboardingStatus: {
      type: String,
      default: 'not_started',
    },
    estimatedStockValue: String,
    estimatedRestockValue: String,
    restockingFrequency: String,
    estimatedDailySalesRevenue: String,
    slowestDaySales: String,
    paymentModes: [String],
    monthlyNetProfit: String,
    hasPosTerminal: String,
    posProviderName: String,
    salesTrackingMethod: String,
    creditStartTimeline: String,
    willingDailyRepayment: String,
    informationConfirmed: Boolean,
    price: {
      type: String,
      default: '0',
    },
    availableBalance: {
      type: Number,
      default: 0,
    },
    disbursed: String,

    // Legacy password field (from old data)
    password: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: 'retailers', // Exact collection name from production
    strict: false, // Allow flexible schema for production compatibility
  }
);

// Indexes for performance
retailerSchema.index({ retailer_user_id: 1 }, { unique: true });
retailerSchema.index({ phoneNumber: 1 });
retailerSchema.index({ email: 1 }, { sparse: true });
retailerSchema.index({ companyEmail: 1 }, { sparse: true });
retailerSchema.index({ is_active: 1 });
retailerSchema.index({ createdAt: -1 });

// Instance method: Remove sensitive data when converting to JSON
retailerSchema.methods.toJSON = function () {
  const retailerObject = this.toObject() as Record<string, unknown>;

  // Remove sensitive fields
  delete retailerObject.password;
  delete retailerObject.__v;

  return retailerObject;
};

// Create and export model
export const Retailer = mongoose.model<IRetailer, RetailerModel>('Retailer', retailerSchema);
