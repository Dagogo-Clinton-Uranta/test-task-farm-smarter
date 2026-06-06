import mongoose from 'mongoose';
import { Response } from '../models/response.model.js';
import { Form } from '../models/form.model.js';
import { Farmer } from '../models/farmer.model.js';
import { farmerService } from './farmer.service.js';
import { retailerService } from './retailer.service.js';
import { creditScoreService } from './credit-score.service.js';
import { logger } from '../utils/logger.js';

/**
 * Form Data Extraction Service
 * Extracts farmer data from form responses and creates/updates farmer records
 */

/**
 * Map form field names to farmer model fields
 */
const mapFormFieldToFarmerField = (formFieldName: string, value: any): Record<string, any> => {
  const mapping: Record<string, string> = {
    // Basic info
    first_name: 'firstName',
    last_name: 'lastName',
    other_names: 'otherNames',
    can_i_get_your_image: 'photo',
    phone_number: 'phone',
    phoneNumber: 'phone',
    email: 'email',
    
    // Demographics
    gender: 'gender',
    age_range: 'age',
    marital_status: 'maritalStatus',
    no_of_spouses: 'noOfSpouse',
    no_of_children: 'noOfChildren',
    
    // Identification
    id_government_identification_type: 'identification',
    do_you_have_a_smartphone: 'smartphone',
    
    // Farming details
    farming_type: 'farmingType',
    cropslivestock: 'cropsLivestock',
    farm_size_unit: 'farmSizeUnit',
    farm_size: 'farmSize',
    farm_location: 'farmLocationGPS',
    
    // Practices
    do_you_do_irrigation: 'usesIrrigation',
    do_you_have_insurance: 'hasInsurance',
    insurance_name: 'insuranceName',
    do_you_do_organic_farming: 'organicFarmingInterest',
    
    // Production
    previous_production_tons: 'previousProduction',
    previous_chemical_used: 'previousChemicals',
    list_chemicals_used: 'chemicals',
    where_do_you_sell_inputs: 'sellLocation',
    inputs: 'input',
    farming_experience: 'farmingExperience',
    previous_costs: 'previousCosts',
    challenges: 'challengesText',
  };

  const farmerFieldName = mapping[formFieldName];
  if (!farmerFieldName) {
    return {};
  }

  // Handle special transformations
  if (formFieldName === 'farm_location' && typeof value === 'string') {
    // GPS location might be in format "lat, lng" or object
    return { [farmerFieldName]: value, location: value };
  }

  if (formFieldName === 'no_of_spouses' || formFieldName === 'no_of_children') {
    // Convert to number
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    return { [farmerFieldName]: isNaN(numValue) ? 0 : numValue };
  }

  if (formFieldName === 'farm_size') {
    // Convert to number if possible
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return { [farmerFieldName]: isNaN(numValue) ? value : numValue };
  }

  return { [farmerFieldName]: value };
};

/**
 * Extract farmer data from response object
 */
const extractFarmerDataFromResponse = (
  responseObject: Record<string, any>,
  formFields: any[],
  responseId: string,
  agentUserId?: string,
  adminUserId?: string
): Record<string, any> => {
  const farmerData: Record<string, any> = {
    OriginalResponseId: new mongoose.Types.ObjectId(responseId),
  };

  // Set user references
  if (agentUserId) {
    farmerData.agent_user_id = new mongoose.Types.ObjectId(agentUserId);
    farmerData.addedByType = 'agent';
    farmerData.addedById = agentUserId;
  }
  if (adminUserId) {
    farmerData.admin_user_id = new mongoose.Types.ObjectId(adminUserId);
    // May be overridden to retailer below after retailer lookup
    farmerData.addedByType = 'admin';
    farmerData.addedById = adminUserId;
  }

  // Map all form fields to farmer fields
  Object.keys(responseObject).forEach((fieldName) => {
    const value = responseObject[fieldName];
    if (value === null || value === undefined || value === '') {
      return;
    }

    const mappedFields = mapFormFieldToFarmerField(fieldName, value);
    Object.assign(farmerData, mappedFields);
  });

  // Generate required fields if missing
  if (!farmerData.farmerId) {
    const firstName = farmerData.firstName || '';
    const lastName = farmerData.lastName || '';
    farmerData.farmerId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}`;
  }

  if (!farmerData.name) {
    const firstName = farmerData.firstName || '';
    const lastName = farmerData.lastName || '';
    farmerData.name = `${firstName} ${lastName}`.trim() || 'Unknown Farmer';
  }

  // Set default values for required fields if missing
  if (!farmerData.locationName) {
    farmerData.locationName = farmerData.location || farmerData.farmLocationGPS || 'Unknown Location';
  }

  if (!farmerData.photo) {
    farmerData.photo = farmerData.can_i_get_your_image || '';
  }

  if (!farmerData.farmingCrop) {
    farmerData.farmingCrop = farmerData.farmingType || farmerData.cropsLivestock || 'Unknown';
  }

  if (!farmerData.harvestPurpose) {
    farmerData.harvestPurpose = 'Not specified';
  }

  if (!farmerData.harvestSize) {
    farmerData.harvestSize = 'Not specified';
  }

  if (!farmerData.identification) {
    farmerData.identification = farmerData.id_government_identification_type || 'No';
  }

  if (!farmerData.smartphone) {
    farmerData.smartphone = farmerData.do_you_have_a_smartphone || 'No';
  }

  if (!farmerData.organicFarmingInterest) {
    farmerData.organicFarmingInterest = farmerData.do_you_do_organic_farming || 'No';
  }

  if (farmerData.noOfChildren === undefined) {
    farmerData.noOfChildren = 0;
  }

  if (farmerData.noOfSpouse === undefined) {
    farmerData.noOfSpouse = 0;
  }

  if (farmerData.availableBalance === undefined) {
    farmerData.availableBalance = 0;
  }

  if (farmerData.riskScore === undefined) {
    farmerData.riskScore = 0;
  }

  if (!farmerData.pre_retailer) {
    farmerData.pre_retailer = 'No';
  }

  if (!farmerData.requests) {
    farmerData.requests = [];
  }

  if (!farmerData.repayments) {
    farmerData.repayments = [];
  }

  // Map legacy fields for backward compatibility
  if (farmerData.cropsLivestock) {
    farmerData.produce = farmerData.cropsLivestock;
    farmerData.crop_types = farmerData.cropsLivestock;
  }

  if (farmerData.farmSize) {
    farmerData.farm_size = String(farmerData.farmSize);
  }

  if (farmerData.location || farmerData.farmLocationGPS) {
    farmerData.location = farmerData.location || farmerData.farmLocationGPS;
    farmerData.gps = farmerData.location;
  }

  if (farmerData.previousChemicals) {
    farmerData.chemicals = farmerData.previousChemicals;
  }

  if (farmerData.sellLocation) {
    farmerData.market = farmerData.sellLocation;
  }

  if (farmerData.organicFarmingInterest) {
    farmerData.organic = farmerData.organicFarmingInterest;
  }

  if (farmerData.hasInsurance) {
    farmerData.insurance = farmerData.hasInsurance;
  }

  if (farmerData.farmingExperience) {
    farmerData.experience = farmerData.farmingExperience;
  }

  if (farmerData.previousCosts) {
    farmerData.cost = farmerData.previousCosts;
  }

  if (farmerData.challengesText) {
    farmerData.challenges = farmerData.challengesText;
    farmerData.challenge = farmerData.challengesText;
  }

  return farmerData;
};

/**
 * Find existing farmer by phone or email
 */
const findExistingFarmer = async (phone?: string, email?: string): Promise<any | null> => {
  if (!phone && !email) {
    return null;
  }

  try {
    const query: any = {
      is_deleted: { $ne: true },
    };

    if (phone) {
      query.$or = [
        { phone: phone },
        { phoneNumber: phone },
        { phone_number: phone },
      ];
    }

    if (email) {
      if (query.$or) {
        query.$or.push({ email: email });
      } else {
        query.$or = [{ email: email }];
      }
    }

    const farmer = await Farmer.findOne(query).exec();
    return farmer;
  } catch (error: any) {
    logger.error('Error finding existing farmer', {
      error: error.message,
      stack: error.stack,
      phone,
      email,
    });
    return null;
  }
};

/**
 * Extract form data from a single response and create/update farmer
 */
export const extractFormDataFromResponse = async (
  responseId: string
): Promise<any | null> => {
  try {
    // Get response
    const response = await Response.findById(responseId).exec();

    if (!response || response.is_deleted) {
      logger.warn('Response not found or deleted', { responseId });
      return null;
    }

    // Get form to check if it's a farmer form
    const form = await Form.findById(response.form_id).exec();

    if (!form || form.is_deleted) {
      logger.warn('Form not found or deleted', { formId: response.form_id });
      return null;
    }

    // Check if this is a farmer form
    if (!form.isFarmerForm) {
      logger.debug('Form is not a farmer form, skipping extraction', {
        formId: form._id,
        responseId,
      });
      return null;
    }

    const responseObject = response.responseObject || {};
    const phone = responseObject.phone_number || responseObject.phoneNumber || responseObject.phone;
    const email = responseObject.email;

    // Find existing farmer
    const existingFarmer = await findExistingFarmer(phone, email);

    // Extract farmer data from response
    let farmerData = extractFarmerDataFromResponse(
      responseObject,
      form.fields || [],
      responseId,
      response.agent_user_id?.toString(),
      response.admin_user_id?.toString()
    );

    // If admin_user_id is set, check if it's a retailer and associate
    if (response.admin_user_id) {
      try {
        const retailer = await retailerService.getRetailerByUserId(
          response.admin_user_id.toString()
        );
        if (retailer) {
          // Associate farmer with retailer
          farmerData.retailerId = response.admin_user_id.toString();
          farmerData.retailer_id = retailer._id;
          farmerData.addedByType = 'retailer';
          farmerData.addedById = response.admin_user_id.toString();
        }
      } catch (error) {
        // Not a retailer, continue without retailer association
        logger.debug('Admin user is not a retailer', {
          adminUserId: response.admin_user_id.toString(),
        });
      }
    }

    if (existingFarmer) {
      // Update existing farmer
      // Only update if response is more recent than farmer's last update
      const responseUpdatedAt = response.updatedAt || response.createdAt;
      const farmerUpdatedAt = existingFarmer.updatedAt || existingFarmer.createdAt;

      if (responseUpdatedAt && farmerUpdatedAt && responseUpdatedAt > farmerUpdatedAt) {
        // Merge with existing data (preserve some fields)
        const updatedData = {
          ...farmerData,
          _id: existingFarmer._id,
          farmerId: existingFarmer.farmerId, // Preserve farmerId
          requests: existingFarmer.requests || [],
          repayments: existingFarmer.repayments || [],
          availableBalance: existingFarmer.availableBalance || 0,
          riskScore: existingFarmer.riskScore || 0,
        };

        const updatedFarmer = await farmerService.updateFarmerById(
          existingFarmer._id.toString(),
          updatedData
        );

        if (updatedFarmer) {
          try {
            await creditScoreService.calculateAndStoreFarmerScore({
              farmerId: updatedFarmer._id.toString(),
              reason: 'farmer_update',
              responseObject: responseObject as Record<string, unknown>,
              responseId,
              triggeredBy: response.admin_user_id?.toString() || response.agent_user_id?.toString(),
            });
          } catch (scoreError: any) {
            logger.error('Failed to calculate credit score after farmer update', {
              farmerId: updatedFarmer._id.toString(),
              responseId,
              error: scoreError.message,
            });
          }
        }

        logger.info('Farmer updated from response', {
          farmerId: updatedFarmer?._id.toString(),
          responseId,
        });

        return updatedFarmer;
      } else {
        logger.debug('Response is not newer than farmer, skipping update', {
          farmerId: existingFarmer._id.toString(),
          responseId,
        });
        return existingFarmer;
      }
    } else {
      // Create new farmer
      const newFarmer = await farmerService.createFarmer(farmerData);

      try {
        await creditScoreService.calculateAndStoreFarmerScore({
          farmerId: newFarmer._id.toString(),
          reason: 'farmer_create',
          responseObject: responseObject as Record<string, unknown>,
          responseId,
          triggeredBy: response.admin_user_id?.toString() || response.agent_user_id?.toString(),
        });
      } catch (scoreError: any) {
        logger.error('Failed to calculate credit score after farmer creation', {
          farmerId: newFarmer._id.toString(),
          responseId,
          error: scoreError.message,
        });
      }

      logger.info('Farmer created from response', {
        farmerId: newFarmer._id.toString(),
        responseId,
      });

      return newFarmer;
    }
  } catch (error: any) {
    logger.error('Error extracting form data from response', {
      error: error.message,
      stack: error.stack,
      responseId,
    });
    throw error;
  }
};

/**
 * Extract form data from all responses for farmer forms
 * Used by background job to process missed responses
 */
export const extractFormDataFromAllResponses = async (): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> => {
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  try {
    // Get all farmer forms
    const farmerForms = await Form.find({
      isFarmerForm: true,
      is_deleted: false,
    }).exec();

    if (farmerForms.length === 0) {
      logger.info('No farmer forms found');
      return stats;
    }

    const formIds = farmerForms.map((form) => form._id);

    // Get all responses for farmer forms
    const responses = await Response.find({
      form_id: { $in: formIds },
      is_deleted: false,
    }).exec();

    logger.info('Processing responses for farmer extraction', {
      formCount: farmerForms.length,
      responseCount: responses.length,
    });

    for (const response of responses) {
      try {
        stats.processed++;

        const result = await extractFormDataFromResponse(response._id.toString());

        if (result) {
          // Check if this was a new creation or update
          // We can determine this by checking if OriginalResponseId matches
          const responseId = response._id.toString();
          if (result.OriginalResponseId?.toString() === responseId) {
            // Check if farmer was just created (recent timestamp)
            const timeDiff = Date.now() - new Date(result.createdAt).getTime();
            if (timeDiff < 60000) {
              // Created within last minute
              stats.created++;
            } else {
              stats.updated++;
            }
          } else {
            stats.updated++;
          }
        }
      } catch (error: any) {
        stats.errors++;
        logger.error('Error processing response', {
          error: error.message,
          responseId: response._id.toString(),
        });
      }
    }

    logger.info('Completed farmer extraction from responses', stats);
    return stats;
  } catch (error: any) {
    logger.error('Error extracting form data from all responses', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Export service object
export const formDataExtractionService = {
  extractFormDataFromResponse,
  extractFormDataFromAllResponses,
};
