import { Document, Types } from 'mongoose';

/**
 * Retailer Interface matching EXACT production database schema
 * Collection: test.retailers
 *
 * Relationships:
 * - retailer_user_id -> userdbs._id (1:1)
 */

export interface IRetailer extends Document {
  _id: Types.ObjectId;

  // Required fields
  retailer_user_id: Types.ObjectId;
  phoneNumber: string;
  createdAt: Date;

  // Business info
  companyName?: string;
  companyEmail?: string;
  companyAddress?: string;
  businessName?: string;
  businessAddress?: string;
  businessTown?: string;
  businessNearestLandmark?: string;
  businessGps?: string;
  businessAddressMode?: 'manual' | 'gps';
  businessAddressSameAsHome?: boolean;
  storeName?: string;
  cacRegistered?: string;
  cacRegistrationNumber?: string;
  businessChannel?: string;

  // Personal info
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;

  // Location info
  address?: string;
  state?: string;
  localGovernment?: string;
  nearestLandmark?: string;
  country?: string;
  stateOfOrigin?: string;
  localGovernmentOfOrigin?: string;
  currentState?: string;
  currentLocalGovernment?: string;
  location?: string;
  gps?: string;
  homeAddressMode?: 'manual' | 'gps';

  // Shop info
  shopSize?: string;
  shopOwnership?: string;
  yearsInBusiness?: string;
  contactPerson?: string;

  // ID & Documents
  meansOfId?: string;
  idNumber?: string;
  nin?: string;
  idDocument?: string | null;
  proofOfAddress?: string | null;
  utilityBill?: string | null;
  shopPhotos?: string | null;
  photoUrl?: string;
  photoIdIndUrl?: string;
  photoOfShopIndUrl?: string;
  utilityBillIndUrl?: string;

  // Utility info
  hasBvn?: string;
  bvn?: string;
  hasBusinessBankAccount?: string;
  businessAccountType?: string;
  accountNumber?: string;
  bankName?: string;
  meterNumber?: string;
  utilityType?: string;

  // Status & Financial
  is_active?: boolean;
  onboardingCurrentStep?: number;
  onboardingCompletedSteps?: number[];
  onboardingStatus?: string;
  estimatedStockValue?: string;
  estimatedRestockValue?: string;
  restockingFrequency?: string;
  estimatedDailySalesRevenue?: string;
  slowestDaySales?: string;
  paymentModes?: string[];
  monthlyNetProfit?: string;
  hasPosTerminal?: string;
  posProviderName?: string;
  salesTrackingMethod?: string;
  creditStartTimeline?: string;
  willingDailyRepayment?: string;
  informationConfirmed?: boolean;
  price?: string;
  availableBalance?: number;
  disbursed?: string;

  // Legacy fields
  password?: string;

  // Metadata
  updatedAt?: Date;
  __v?: number;
}

/**
 * Retailer registration input
 */
export interface IRetailerRegisterInput {
  // User creation fields
  email: string;
  passWord: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;

  // Business fields (optional during registration)
  businessName?: string;
  businessAddress?: string;
  businessTown?: string;
  businessNearestLandmark?: string;
  businessGps?: string;
  businessAddressMode?: 'manual' | 'gps';
  businessAddressSameAsHome?: boolean;
  companyName?: string;
  companyEmail?: string;
  storeName?: string;
  state?: string;
  localGovernment?: string;
  cacRegistered?: string;
  cacRegistrationNumber?: string;
  businessChannel?: string;
}

/**
 * Retailer profile update input
 */
export interface IRetailerUpdateInput {
  // Personal info
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;

  // Business info
  companyName?: string;
  companyEmail?: string;
  companyAddress?: string;
  businessName?: string;
  businessAddress?: string;
  businessTown?: string;
  businessNearestLandmark?: string;
  businessGps?: string;
  businessAddressMode?: 'manual' | 'gps';
  businessAddressSameAsHome?: boolean;
  storeName?: string;
  cacRegistered?: string;
  cacRegistrationNumber?: string;
  businessChannel?: string;

  // Contact info
  phoneNumber?: string;
  phone?: string;
  email?: string;

  // Location
  address?: string;
  state?: string;
  localGovernment?: string;
  nearestLandmark?: string;
  stateOfOrigin?: string;
  localGovernmentOfOrigin?: string;
  currentState?: string;
  currentLocalGovernment?: string;
  gps?: string;
  location?: string;
  homeAddressMode?: 'manual' | 'gps';

  // Shop info
  shopSize?: string;
  shopOwnership?: string;
  yearsInBusiness?: string;

  // ID & Documents
  meansOfId?: string;
  idNumber?: string;
  nin?: string;
  idDocument?: string | null;
  proofOfAddress?: string | null;
  utilityBill?: string | null;
  shopPhotos?: string | null;
  hasBvn?: string;
  bvn?: string;
  hasBusinessBankAccount?: string;
  businessAccountType?: string;
  accountNumber?: string;
  bankName?: string;
  meterNumber?: string;
  utilityType?: string;

  onboardingCurrentStep?: number;
  onboardingCompletedSteps?: number[];
  onboardingStatus?: string;
  estimatedStockValue?: string;
  estimatedRestockValue?: string;
  restockingFrequency?: string;
  estimatedDailySalesRevenue?: string;
  slowestDaySales?: string;
  paymentModes?: string[];
  monthlyNetProfit?: string;
  hasPosTerminal?: string;
  posProviderName?: string;
  salesTrackingMethod?: string;
  creditStartTimeline?: string;
  willingDailyRepayment?: string;
  informationConfirmed?: boolean;
}

/**
 * Retailer response (safe to return to client)
 */
export interface IRetailerResponse {
  _id: string;
  retailer_user_id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  businessName?: string;
  businessAddress?: string;
  companyName?: string;
  storeName?: string;
  state?: string;
  localGovernment?: string;
  shopSize?: string;
  yearsInBusiness?: string;
  is_active?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Retailer with populated user data
 */
export interface IRetailerWithUser extends IRetailer {
  user?: {
    _id: Types.ObjectId;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    isRetailer?: boolean;
  };
}
