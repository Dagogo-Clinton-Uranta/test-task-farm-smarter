import mongoose from 'mongoose';
import { Form } from '../models/form.model.js';
import { NotFoundError, ValidationError } from '../utils/error.util.js';
import { IForm, IFormCreateInput, IFormUpdateInput, IFormQueryOptions } from '../interfaces/form.interface.js';
import { logger } from '../utils/logger.js';
import { formConfigService } from './form-config.service.js';

/**
 * Form Service
 * Handles all form-related business logic including aggregation pipelines
 */

/**
 * Get base pipeline items for form aggregation
 * Includes user lookup, creator info, and optional agent details
 */
const getBasePipelineItem = (withAgents = false): any[] => {
  const pipeline: any[] = [
    {
      $addFields: {
        dateCreated: '$createdAt',
        id: '$_id',
      },
    },
    {
      $lookup: {
        from: 'userdbs',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $unset: 'user.passWord' },
    { $unset: 'user.password' },
    { $unset: 'updatedAt' },
    { $unset: 'createdAt' },
    {
      $lookup: {
        from: 'admindbs',
        localField: 'user_id',
        foreignField: 'user_id',
        as: 'creator',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        createdBy: {
          $cond: {
            if: { $ne: ['$creator', null] },
            then: { $concat: ['$creator.firstName', ' ', '$creator.lastName'] },
            else: { $concat: [{ $ifNull: ['$user.firstName', ''] }, ' ', { $ifNull: ['$user.lastName', ''] }] },
          },
        },
      },
    },
    { $unset: 'creator' },
  ];

  if (withAgents) {
    pipeline.push(
      {
        $addFields: {
          agents: {
            $map: {
              input: '$agents',
              as: 'agentId',
              in: {
                $cond: {
                  if: { $eq: [{ $type: '$$agentId' }, 'string'] },
                  then: { $toObjectId: '$$agentId' },
                  else: '$$agentId',
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'agentdbs',
          localField: 'agents',
          foreignField: '_id',
          as: 'agentDetails',
        },
      }
    );
  }

  return pipeline;
};

/**
 * Create a new form
 */
export const createForm = async (formData: IFormCreateInput & { user_id: mongoose.Types.ObjectId }): Promise<IForm> => {
  // If this form is being set as the farmer form, validate required fields
  if (formData.isFarmerForm === true) {
    const validation = formConfigService.validateFarmerFormFields(formData.fields);
    
    if (!validation.isValid) {
      throw new ValidationError(
        `Farmer form is missing required fields: ${validation.missingFields.join(', ')}`
      );
    }
    
    // Ensure no other form has isFarmerForm: true
    await Form.updateMany(
      { isFarmerForm: true, is_deleted: false },
      { $set: { isFarmerForm: false } }
    );
  }

  const form = new Form(formData);
  return await form.save();
};

/**
 * Update a form
 */
export const updateForm = async (formId: string, updateData: IFormUpdateInput): Promise<IForm> => {
  const form = await Form.findById(formId);

  if (!form) {
    throw new NotFoundError('Form not found');
  }

  // If this form is being set as the farmer form, validate required fields
  if (updateData.isFarmerForm === true) {
    // Use updated fields if provided, otherwise use existing fields
    const fieldsToValidate = updateData.fields || form.fields;
    const validation = formConfigService.validateFarmerFormFields(fieldsToValidate);
    
    if (!validation.isValid) {
      throw new ValidationError(
        `Farmer form is missing required fields: ${validation.missingFields.join(', ')}`
      );
    }
    
    // Ensure no other form has isFarmerForm: true
    await Form.updateMany(
      { _id: { $ne: new mongoose.Types.ObjectId(formId) }, isFarmerForm: true, is_deleted: false },
      { $set: { isFarmerForm: false } }
    );
  }

  Object.assign(form, updateData);
  await form.save();
  return form;
};

/**
 * Get form by ID
 */
export const getFormById = async (id: string, withAgents = false): Promise<IForm | null> => {
  const pipeline: any[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  const result = await Form.aggregate(pipeline);

  if (result.length === 0) {
    return null;
  }

  return result[0] as any;
};

/**
 * Query all forms (for Super Admin)
 */
export const queryForms = async (withAgents = false): Promise<IForm[]> => {
  const pipeline: any[] = [
    {
      $match: {
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  return await Form.aggregate(pipeline);
};

/**
 * Get public forms
 */
export const getPublicForms = async (withAgents = false): Promise<IForm[]> => {
  const pipeline: any[] = [
    {
      $addFields: {
        dateCreated: {
          $toString: '$createdAt',
        },
      },
    },
    {
      $match: {
        isPublic: true,
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  return await Form.aggregate(pipeline);
};

/**
 * Get forms by user ID (creator)
 */
export const getFormsByUserId = async (userId: string, withAgents = false): Promise<IForm[]> => {
  const pipeline: any[] = [
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(userId),
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  return await Form.aggregate(pipeline);
};

/**
 * Get forms shared with user
 */
export const getSharedForms = async (userId: string, withAgents = false): Promise<IForm[]> => {
  const pipeline: any[] = [
    {
      $match: {
        sharedWith: userId.toString(),
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  return await Form.aggregate(pipeline);
};

/**
 * Get forms by agent ID
 */
export const getFormsByAgentId = async (agentId: string, withAgents = false): Promise<IForm[]> => {
  const pipeline: any[] = [
    {
      $match: {
        agents: agentId.toString(),
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  return await Form.aggregate(pipeline);
};

/**
 * Get farmer form (form with isFarmerForm: true)
 * This form is always public and accessible to all authenticated users
 */
export const getFarmerForm = async (): Promise<IForm | null> => {
  const pipeline: any[] = [
    {
      $match: {
        isFarmerForm: true,
        is_deleted: false,
      },
    },
    ...getBasePipelineItem(false),
  ];

  const results = await Form.aggregate(pipeline);
  return results.length > 0 ? (results[0] as any) : null;
};

/**
 * Get form responses (includes responses lookup)
 */
export const getFormResponses = async (formId: string, withAgents = false): Promise<IForm | null> => {
  const pipeline: any[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(formId),
      },
    },
    {
      $lookup: {
        from: 'responsesdbs',
        let: { formId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$form_id', '$$formId'] },
                  { $eq: ['$is_deleted', false] },
                ],
              },
            },
          },
        ],
        as: 'responses',
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  const result = await Form.aggregate(pipeline).allowDiskUse(true);

  if (result.length === 0) {
    return null;
  }

  return result[0] as any;
};

/**
 * Get agent form responses (filtered by agent)
 */
export const getAgentFormResponses = async (
  formId: string,
  agentUserId: string,
  withAgents = false
): Promise<IForm | null> => {
  const pipeline: any[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(formId),
      },
    },
    {
      $lookup: {
        from: 'responsesdbs',
        let: { formId: '$_id', agentId: new mongoose.Types.ObjectId(agentUserId) },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$form_id', '$$formId'] },
                  { $eq: ['$agent_user_id', '$$agentId'] },
                  { $eq: ['$is_deleted', false] },
                ],
              },
            },
          },
        ],
        as: 'responses',
      },
    },
    ...getBasePipelineItem(withAgents),
  ];

  const result = await Form.aggregate(pipeline).allowDiskUse(true);

  if (result.length === 0) {
    return null;
  }

  return result[0] as any;
};

/**
 * Get agents attached to a form
 */
export const getAgentsAttachedToForm = async (formId: string): Promise<IForm | null> => {
  const form = await Form.findById(formId).select('agents').populate({
    path: 'user_id',
    select: '-passWord -password',
  });

  return form as any;
};

/**
 * Add agent to form
 */
export const addAgentToForm = async (formId: string, agentId: string): Promise<IForm> => {
  const form = await Form.findById(formId);

  if (!form) {
    throw new NotFoundError('Form not found');
  }

  // Convert agentId to string for consistency
  const agentIdStr = agentId.toString();

  // Check if agent already exists
  if (!form.agents || !form.agents.some((id) => id.toString() === agentIdStr)) {
    form.agents = form.agents || [];
    form.agents.push(agentIdStr);
    await form.save();
  }

  return form;
};

/**
 * Get agent forms count
 */
export const getAgentFormsCount = async (agentId: string): Promise<number> => {
  try {
    const count = await Form.countDocuments({
      agents: { $in: [agentId] },
      is_deleted: false,
    });
    return count;
  } catch (error: any) {
    logger.error('Error counting agent forms', {
      error: error.message,
      stack: error.stack,
      agentId,
    });
    return 0;
  }
};

/**
 * Remove duplicates by ID from array
 */
export const removeDuplicatesById = <T extends { _id: any }>(arr: T[]): T[] => {
  const uniqueIds = new Set();
  return arr.filter((obj) => {
    const id = obj._id?.toString();
    if (uniqueIds.has(id)) {
      return false;
    } else {
      uniqueIds.add(id);
      return true;
    }
  });
};

// Export service object
export const formService = {
  createForm,
  updateForm,
  getFormById,
  getFarmerForm,
  queryForms,
  getPublicForms,
  getFormsByUserId,
  getSharedForms,
  getFormsByAgentId,
  getFormResponses,
  getAgentFormResponses,
  getAgentsAttachedToForm,
  addAgentToForm,
  getAgentFormsCount,
  removeDuplicatesById,
};
