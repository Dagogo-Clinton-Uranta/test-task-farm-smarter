import { Document, Types } from 'mongoose';

/**
 * Farmer Interface matching EXACT production database schema
 * Collection: test.farmers
 *
 * ⚠️ CRITICAL: This collection has MANY field variations and inconsistent naming!
 * All variations are included to match the database exactly.
 */

export interface IFarmer extends Document {
  _id: Types.ObjectId;

  // Required fields (based on schema reference)
  farmerId: string;
  name: string;
  locationName: string;
  photo: string;
  farmingCrop: string;
  harvestPurpose: string;
  harvestSize: string;
  identification: string;
  smartphone: string;
  organicFarmingInterest: string;
  noOfChildren: number;
  noOfSpouse: number;
  availableBalance: number;
  riskScore: number | string;
  pre_retailer: string;
  requests: any[]; // Array of request objects
  repayments: any[]; // Array of repayment objects
  createdAt: Date;

  // Age variations
  age?: string | number;
  Age?: string;

  // Name variations
  firstName?: string;
  lastName?: string | null;
  Name?: string;

  // Phone variations
  phone?: string;
  phoneNumber?: string;
  phone_number?: string;

  // Farm size variations
  farmSize?: number | string;
  FarmSize?: number;
  farm_size?: string;
  farmsize?: string;
  farmSizeUnit?: string;
  FarmSizeUnit?: string;

  // Family variations
  family?: number;
  family_size?: string;
  familySize?: string;
  familysize?: string;

  // Location/GPS
  location?: string;
  gps?: string;
  gps_stamp?: string;

  // Chemicals/organic
  chemical?: string;
  chemicals?: string;
  chemical_organic?: string;
  typeOfChemical?: string;

  // Farming details
  crop_types?: string;
  produce?: string;
  production_level?: string;
  productionsize?: string;
  productSoldTo?: string;
  market?: string;
  offtake?: string;
  offtaking?: string;
  organic?: string;

  // Experience/costs
  experience?: string;
  cost?: string;

  // Other fields
  gender?: string;
  challenge?: string;
  challenges?: string;
  problem?: string;
  insurance?: string;
  insuranceinterest?: string;
  interest?: string;
  desire?: string;
  seeds?: string;
  tech?: string;
  isUsingRealPhoto?: string;

  // Arrays
  input?: any[]; // Input tracking
  harvests?: any[]; // Harvest tracking

  // References
  agent_user_id?: Types.ObjectId; // → userdbs
  agentAddedId?: string;
  retailer_id?: Types.ObjectId; // → retailers
  OriginalResponseId?: Types.ObjectId; // → responsesdbs
  addedByType?: 'agent' | 'retailer' | 'admin';
  addedById?: string;

  // Legacy form fields
  uuid?: string;
  created_by?: string;
  last_submitter?: string;
  last_submit?: string;
  start_record?: string;
  end_record?: string;

  // Auth (some farmers have login)
  username?: string | null;
  password?: string;

  // Irrigation
  utilisezvous_lirrigation__oui_or_non?: string;

  updatedAt?: Date;
  __v?: number;
}

/**
 * Farmer creation input
 */
export interface IFarmerCreateInput {
  farmerId: string;
  name: string;
  locationName: string;
  photo: string;
  farmingCrop: string;
  harvestPurpose: string;
  harvestSize: string;
  identification: string;
  smartphone: string;
  organicFarmingInterest: string;
  noOfChildren: number;
  noOfSpouse: number;
  availableBalance: number;
  riskScore: number | string;
  pre_retailer: string;
  requests?: any[];
  repayments?: any[];
  [key: string]: any; // Allow any other fields due to schema variations
}

/**
 * Farmer update input
 */
export interface IFarmerUpdateInput {
  [key: string]: any; // Flexible update due to many optional fields
}

/**
 * Farmer with populated data (from aggregation)
 */
export interface IFarmerWithDetails extends IFarmer {
  agent?: any;
  retailer?: any;
  response?: any;
}
