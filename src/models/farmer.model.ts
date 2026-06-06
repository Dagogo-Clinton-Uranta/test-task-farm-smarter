import mongoose, { Schema, Model } from 'mongoose';
import { IFarmer } from '../interfaces/farmer.interface.js';

/**
 * Farmer Schema matching EXACT production database
 * Collection: test.farmers
 *
 * ⚠️ CRITICAL: This collection has MANY field variations and inconsistent naming!
 * All fields are optional except those marked as required in the schema reference.
 * Using Schema.Types.Mixed for flexible fields that can have varying types.
 */

interface IFarmerMethods {
  // Add instance methods here if needed
}

type FarmerModel = Model<IFarmer, object, IFarmerMethods>;

const farmerSchema = new Schema<IFarmer, FarmerModel, IFarmerMethods>(
  {
    // Required fields (based on schema reference)
    farmerId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    farmingCrop: {
      type: String,
      required: true,
    },
    harvestPurpose: {
      type: String,
      required: true,
    },
    harvestSize: {
      type: String,
      required: true,
    },
    identification: {
      type: String,
      required: true,
    },
    smartphone: {
      type: String,
      required: true,
    },
    organicFarmingInterest: {
      type: String,
      required: true,
    },
    noOfChildren: {
      type: Number,
      required: true,
    },
    noOfSpouse: {
      type: Number,
      required: true,
    },
    availableBalance: {
      type: Number,
      required: true,
    },
    riskScore: {
      type: Schema.Types.Mixed, // Can be number or string
      required: true,
    },
    pre_retailer: {
      type: String,
      required: true,
    },
    requests: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },
    repayments: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },

    // Age variations
    age: Schema.Types.Mixed, // Can be string or number
    Age: String,

    // Name variations
    firstName: String,
    lastName: Schema.Types.Mixed, // Can be string or null
    Name: String,

    // Phone variations
    phone: String,
    phoneNumber: String,
    phone_number: String,

    // Farm size variations
    farmSize: Schema.Types.Mixed, // Can be number or string
    FarmSize: Number,
    farm_size: String,
    farmsize: String,
    farmSizeUnit: String,
    FarmSizeUnit: String,

    // Family variations
    family: Number,
    family_size: String,
    familySize: String,
    familysize: String,

    // Location/GPS
    location: String,
    gps: String,
    gps_stamp: String,

    // Chemicals/organic
    chemical: String,
    chemicals: String,
    chemical_organic: String,
    typeOfChemical: String,

    // Farming details
    crop_types: String,
    produce: String,
    production_level: String,
    productionsize: String,
    productSoldTo: String,
    market: String,
    offtake: String,
    offtaking: String,
    organic: String,

    // Experience/costs
    experience: String,
    cost: String,

    // Other fields
    gender: String,
    challenge: String,
    challenges: String,
    problem: String,
    insurance: String,
    insuranceinterest: String,
    interest: String,
    desire: String,
    seeds: String,
    tech: String,
    isUsingRealPhoto: String,

    // Arrays
    input: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },
    harvests: {
      type: [Schema.Types.Mixed] as any,
      default: [],
    },

    // References
    agent_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs collection
    },
    agentAddedId: String,
    retailer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Retailer', // Reference to retailers collection
    },
    addedByType: {
      type: String,
      enum: ['agent', 'retailer', 'admin'],
    },
    addedById: String,
    OriginalResponseId: {
      type: Schema.Types.ObjectId,
      ref: 'Response', // Reference to responsesdbs collection
    },

    // Legacy form fields
    uuid: String,
    created_by: String,
    last_submitter: String,
    last_submit: String,
    start_record: String,
    end_record: String,

    // Auth (some farmers have login)
    username: {
      type: Schema.Types.Mixed, // Can be string or null
      default: null,
    },
    password: {
      type: String,
      default: null,
    },

    // Irrigation
    utilisezvous_lirrigation__oui_or_non: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'farmers', // ⚠️ Exact collection name from production
    strict: false, // Allow fields not defined in schema (due to many variations)
  }
);

// Indexes for performance
farmerSchema.index({ farmerId: 1 });
farmerSchema.index({ agent_user_id: 1 });
farmerSchema.index({ retailer_id: 1 });
farmerSchema.index({ addedByType: 1 });
farmerSchema.index({ addedById: 1 });
farmerSchema.index({ OriginalResponseId: 1 });
farmerSchema.index({ createdAt: -1 });
farmerSchema.index({ phone: 1 });
farmerSchema.index({ phoneNumber: 1 });

// Create and export model
export const Farmer = mongoose.model<IFarmer, FarmerModel>('Farmer', farmerSchema);
