import mongoose from 'mongoose';
import { Farmer } from '../models/farmer.model.js';
import { IFarmer, IFarmerWithDetails } from '../interfaces/farmer.interface.js';

/**
 * Farmer Service
 * Handles all farmer-related business logic
 */

/**
 * Get base pipeline for farmer aggregation
 * Includes agent, retailer, and response lookups
 */
const getBaseFarmerPipeline = (): any[] => {
  return [
    {
      $lookup: {
        from: 'userdbs',
        localField: 'agent_user_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    {
      $unwind: {
        path: '$agent',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'retailers',
        localField: 'retailer_id',
        foreignField: '_id',
        as: 'retailer',
      },
    },
    {
      $unwind: {
        path: '$retailer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'responsesdbs',
        localField: 'OriginalResponseId',
        foreignField: '_id',
        as: 'response',
      },
    },
    {
      $unwind: {
        path: '$response',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'agentdbs',
        localField: 'agent_user_id',
        foreignField: 'user_id',
        as: 'agent_profile',
      },
    },
    {
      $unwind: {
        path: '$agent_profile',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'userdbs',
        let: {
          addedByObjectId: {
            $convert: { input: '$addedById', to: 'objectId', onError: null, onNull: null },
          },
        },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$addedByObjectId'] } } },
          { $project: { passWord: 0, password: 0 } },
        ],
        as: 'addedByUser',
      },
    },
    {
      $unwind: {
        path: '$addedByUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'agentdbs',
        localField: 'addedByUser._id',
        foreignField: 'user_id',
        as: 'addedByAgent',
      },
    },
    {
      $unwind: {
        path: '$addedByAgent',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'admindbs',
        localField: 'addedByUser._id',
        foreignField: 'user_id',
        as: 'addedByAdmin',
      },
    },
    {
      $unwind: {
        path: '$addedByAdmin',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'retailers',
        localField: 'addedByUser._id',
        foreignField: 'retailer_user_id',
        as: 'addedByRetailer',
      },
    },
    {
      $unwind: {
        path: '$addedByRetailer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'userdbs',
        localField: 'retailer.retailer_user_id',
        foreignField: '_id',
        as: 'retailer_user',
      },
    },
    {
      $unwind: {
        path: '$retailer_user',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Remove sensitive fields from agent
    {
      $unset: 'agent.passWord',
    },
    {
      $unset: 'agent.password',
    },
    {
      $unset: 'retailer_user.passWord',
    },
    {
      $unset: 'retailer_user.password',
    },
    {
      $unset: 'addedByUser.passWord',
    },
    {
      $unset: 'addedByUser.password',
    },
  ];
};

/**
 * Get all farmers
 * Can optionally include populated agent, retailer, and response data
 */
export const getAllFarmers = async (includeDetails: boolean = false): Promise<IFarmer[] | IFarmerWithDetails[]> => {
  if (includeDetails) {
    const pipeline = getBaseFarmerPipeline();
    return await Farmer.aggregate(pipeline);
  }
  return await Farmer.find().exec();
};

/**
 * Get all farmers with pagination and optional keyword search
 */
export const getFarmersPaginated = async (
  page: number = 1,
  limit: number = 10,
  keyword?: string
): Promise<{
  farmers: IFarmer[];
  page: number;
  pages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> => {
  const skip = (page - 1) * limit;

  const searchQuery: any = {};
  if (keyword) {
    searchQuery.$or = [
      { firstName: { $regex: keyword, $options: 'i' } },
      { lastName: { $regex: keyword, $options: 'i' } },
      { name: { $regex: keyword, $options: 'i' } },
      { farmerId: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } },
      { phoneNumber: { $regex: keyword, $options: 'i' } },
      { locationName: { $regex: keyword, $options: 'i' } },
      { location: { $regex: keyword, $options: 'i' } },
    ];
  }

  const totalCount = await Farmer.countDocuments(searchQuery);
  const pages = Math.ceil(totalCount / limit);

  const farmers = await Farmer.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('farmerId firstName lastName name age Age farmingType farmingCrop cropsLivestock produce locationName location farmLocationGPS phone phoneNumber phone_number photo createdAt')
    .exec();

  return {
    farmers,
    page,
    pages,
    totalCount,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
};

/**
 * Get farmer by ID
 * Handles both MongoDB _id (ObjectId) and farmerId (string)
 */
export const getFarmerById = async (id: string, includeDetails: boolean = false): Promise<IFarmer | IFarmerWithDetails | null> => {
  // Check if id is a valid ObjectId
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
  
  const query = isObjectId ? { _id: new mongoose.Types.ObjectId(id) } : { farmerId: id };

  if (includeDetails) {
    const pipeline: any[] = [
      {
        $match: query,
      },
      ...getBaseFarmerPipeline(),
    ];
    const results = await Farmer.aggregate(pipeline);
    return results.length > 0 ? results[0] : null;
  }
  
  // Use findOne for non-ObjectId queries, findById for ObjectId
  const farmer = isObjectId
    ? await Farmer.findById(id)
        .populate('agent_user_id', '-passWord -password')
        .populate('retailer_id')
        .populate('OriginalResponseId')
        .exec()
    : await Farmer.findOne(query)
        .populate('agent_user_id', '-passWord -password')
        .populate('retailer_id')
        .populate('OriginalResponseId')
        .exec();
  
  return farmer;
};

/**
 * Get farmers by agent user ID
 */
export const getFarmersByAgentUserId = async (agentUserId: string): Promise<IFarmer[]> => {
  return await Farmer.find({ agent_user_id: agentUserId }).exec();
};

/**
 * Get farmers by retailer ID
 */
export const getFarmersByRetailerId = async (retailerId: string): Promise<IFarmer[]> => {
  return await Farmer.find({ retailer_id: retailerId })
    .sort({ createdAt: -1 })
    .exec();
};

/**
 * Get farmers by retailer user ID (for logged-in retailer)
 * Returns paginated results with optional search
 * Supports both retailerId (user ID) and retailer_id (retailer document ID) for flexibility
 */
export const getFarmersByRetailerUserId = async (
  retailerUserId: string,
  page: number = 1,
  limit: number = 10,
  keyword?: string
): Promise<{
  farmers: IFarmer[];
  page: number;
  pages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> => {
  const skip = (page - 1) * limit;

  // Build search query - support both retailerId (user ID) and retailer_id (retailer document ID)
  // This handles cases where farmers might be stored with either field
  const retailerFilter = {
    $or: [
      { retailerId: retailerUserId },
      // Also try to match by retailer_id if it's stored as user ID (for backward compatibility)
      { retailer_id: new mongoose.Types.ObjectId(retailerUserId) },
    ],
  };

  // Build the final query
  let searchQuery: any;

  // Add name search if keyword provided
  if (keyword) {
    const nameSearch = {
      $or: [
        { firstName: { $regex: keyword, $options: 'i' } },
        { lastName: { $regex: keyword, $options: 'i' } },
        { otherNames: { $regex: keyword, $options: 'i' } },
        { name: { $regex: keyword, $options: 'i' } },
      ],
    };
    // Use $and to combine retailer filter with name search
    searchQuery = {
      $and: [retailerFilter, nameSearch],
    };
  } else {
    // No keyword, just use retailer filter
    searchQuery = retailerFilter;
  }

  const totalCount = await Farmer.countDocuments(searchQuery);
  const pages = Math.ceil(totalCount / limit);

  const farmers = await Farmer.find(searchQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('firstName lastName otherNames phone phoneNumber email gender age farmingType cropsLivestock farmSize farmSizeUnit farmLocationGPS createdAt farmerId photo creditScore creditScoreCategory name')
    .exec();

  return {
    farmers,
    page,
    pages,
    totalCount,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
};

/**
 * Create a new farmer
 */
export const createFarmer = async (farmerData: any): Promise<IFarmer> => {
  // Map farmLocationGPS to location and gps fields (if provided)
  if (farmerData.farmLocationGPS) {
    // Handle both string format "lat,lng" and object format {latitude, longitude}
    let locationString: string;
    
    if (typeof farmerData.farmLocationGPS === 'string') {
      locationString = farmerData.farmLocationGPS;
    } else if (typeof farmerData.farmLocationGPS === 'object' && farmerData.farmLocationGPS.latitude && farmerData.farmLocationGPS.longitude) {
      locationString = `${farmerData.farmLocationGPS.latitude},${farmerData.farmLocationGPS.longitude}`;
    } else {
      locationString = String(farmerData.farmLocationGPS);
    }
    
    // Set location and gps fields from farmLocationGPS
    farmerData.location = locationString;
    farmerData.gps = locationString;
    
    // Also set locationName if not provided
    if (!farmerData.locationName) {
      farmerData.locationName = locationString;
    }
  }
  
  // Set default values for required fields if missing
  if (!farmerData.locationName && !farmerData.location) {
    farmerData.locationName = 'Unknown Location';
  }
  
  const farmer = new Farmer(farmerData);
  return await farmer.save();
};

/**
 * Update farmer by ID
 */
export const updateFarmerById = async (farmerId: string, updateData: any): Promise<IFarmer | null> => {
  return await Farmer.findByIdAndUpdate(farmerId, updateData, { new: true }).exec();
};

/**
 * Delete farmer by ID
 */
export const deleteFarmerById = async (farmerId: string): Promise<IFarmer | null> => {
  return await Farmer.findByIdAndDelete(farmerId).exec();
};

// Export service object
export const farmerService = {
  getAllFarmers,
  getFarmersPaginated,
  getFarmerById,
  getFarmersByAgentUserId,
  getFarmersByRetailerId,
  getFarmersByRetailerUserId,
  createFarmer,
  updateFarmerById,
  deleteFarmerById,
};
