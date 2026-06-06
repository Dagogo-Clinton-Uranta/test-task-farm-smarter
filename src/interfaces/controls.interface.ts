import { Document, Types } from 'mongoose';

/**
 * Controls Interface matching EXACT production database schema
 * Collection: test.admindbs
 *
 * ⚠️ CRITICAL:
 * - Field names must match exactly (user_id, etc.)
 * - Collection name is 'admindbs' not 'admins'
 */

/**
 * CONTROLS HAS 3 DIFFERENT DOCUMENT TYPES AND THEY ARE REFLECTED HERE ,
 * ALL ELEMENTS OF THE 3 DOCUMENT TYPES  ARE MARKED AS OPTIONAL
 * 
 */
export interface IControls extends Document {
  _id: Types.ObjectId;

  /**
   * Common
   */

  name?: 'credit_tiers' | 'credit_caps' | 'interest_rates';

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;

  createdAt?: Date;
  __v?: number;

  /**
   * CREDIT TIERS
   */

  farmers?: any ;
  retailers?: any;

  /**
   * INTEREST RATES
   */

  farmersInterestRate?: InterestRate;
  retailersInterestRate?: InterestRate;

  /**
   * CREDIT CAPS
   */

  retailersCreditCaps?: CreditCapGroup;
}

/**
 * Controls credit tiers update
 */

type TierRange = {
  min?: number;
  max?: number;
};

type TierGroup = {
  gold?: TierRange;
  silver?: TierRange;
  bronze?: TierRange;
  basic?: TierRange;
};

export interface IControlsCreditTiers extends Document {
  _id: Types.ObjectId;

  name: string; // e.g. "credit_tiers"

  farmers: TierGroup;
  retailers: TierGroup;

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;

  createdAt?: Date;
  __v?: number;
}



/**
 * Controls credit cap update
 */
type CreditCap = {
  maxCreditLimit: number;
  maxSingleTransaction: number;
};

type CreditCapGroup = {
  gold: CreditCap;
  silver: CreditCap;
  bronze: CreditCap;
  basic: CreditCap;
};

export interface IControlsCreditCaps extends Document {
  _id: Types.ObjectId;

  name: 'credit_caps';

  retailers: CreditCapGroup;

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;

  createdAt: Date;
  __v?: number;
}

/**
 * Controls credit cap update
 */
type InterestRate = {
  rate: number;
};

export interface IControlsInterestRates extends Document {
  _id: Types.ObjectId;

  name: 'interest_rates';

  farmers: InterestRate;
  retailers: InterestRate;

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;

  createdAt: Date;
  __v?: number;
}

/**DEEP PARTIAL TYPE - TO UPDATE NESTED OBJECTS */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type IControlsUpdateInterestRates = DeepPartial<{
  name: 'interest_rates';
  farmers: InterestRate;
  retailers: InterestRate;
  updatedAt?: Date | null;
 }>





 export type IControlsUpdateCreditCaps = DeepPartial<{
  name: 'credit_caps';

  retailers: CreditCapGroup;

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;
}>;

export type IControlsUpdateCreditTiers = DeepPartial<{
  name: 'credit_tiers';

  farmers: TierGroup;
  retailers: TierGroup;

  updatedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;
}>;


