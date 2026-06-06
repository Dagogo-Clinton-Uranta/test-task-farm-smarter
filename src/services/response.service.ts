import mongoose from 'mongoose';
import { Response } from '../models/response.model.js';
import { ResponseAnalysis } from '../models/response-analysis.model.js';
import { IResponse, IResponseCreateInput, IResponseUpdateInput } from '../interfaces/response.interface.js';
import { IResponseAnalysisCreateInput, IResponseAnalysisUpdateInput } from '../interfaces/response-analysis.interface.js';
import { NotFoundError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';

/**
 * Response Service
 * Handles all response-related operations
 */

/**
 * Get all form responses
 */
export const getAllFormResponses = async (): Promise<IResponse[]> => {
  try {
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'formdbs',
          localField: 'form_id',
          foreignField: '_id',
          as: 'form',
        },
      },
      { $unwind: '$form' },
      {
        $match: {
          is_deleted: false,
          'form.is_deleted': false,
        },
      },
    ];

    return await Response.aggregate(pipeline);
  } catch (error: any) {
    logger.error('Error getting all form responses', {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

/**
 * Get multiple responses by IDs
 */
export const getMultipleResponseById = async (ids: string[]): Promise<IResponse[]> => {
  try {
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    return await Response.find({
      _id: { $in: objectIds },
      is_deleted: false,
    }).populate('form_id');
  } catch (error: any) {
    logger.error('Error getting multiple responses', {
      error: error.message,
      stack: error.stack,
      ids,
    });
    return [];
  }
};

/**
 * Create response(s)
 */
export const createResponse = async (responses: IResponseCreateInput[]): Promise<IResponse[]> => {
  try {
    const createdResponses = await Response.insertMany(responses);
    return createdResponses;
  } catch (error: any) {
    logger.error('Error creating responses', {
      error: error.message,
      stack: error.stack,
      count: responses.length,
    });
    throw error;
  }
};

/**
 * Create single response document
 */
export const createSingleResponse = async (response: IResponseCreateInput): Promise<IResponse> => {
  try {
    return await Response.create(response);
  } catch (error: any) {
    logger.error('Error creating single response', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Find response by idempotency key scoped to agent user
 */
export const getResponseByClientSubmissionId = async (
  agentUserId: string,
  clientSubmissionId: string
): Promise<IResponse | null> => {
  try {
    return await Response.findOne({
      agent_user_id: new mongoose.Types.ObjectId(agentUserId),
      client_submission_id: clientSubmissionId,
      is_deleted: false,
    }).exec();
  } catch (error: any) {
    logger.error('Error getting response by client submission id', {
      error: error.message,
      stack: error.stack,
      agentUserId,
      clientSubmissionId,
    });
    return null;
  }
};

/**
 * Get response count by agent user ID
 */
export const getResponseCountByAgentUserId = async (agentUserId: string): Promise<number> => {
  try {
    const count = await Response.countDocuments({
      agent_user_id: new mongoose.Types.ObjectId(agentUserId),
      is_deleted: false,
    });
    return count;
  } catch (error: any) {
    logger.error('Error counting responses by agent user ID', {
      error: error.message,
      stack: error.stack,
      agentUserId,
    });
    return 0;
  }
};

/**
 * Get unique form IDs that agent has responded to
 */
export const getUniqueFormIdsByAgentUserId = async (agentUserId: string): Promise<string[]> => {
  try {
    const responses = await Response.distinct('form_id', {
      agent_user_id: new mongoose.Types.ObjectId(agentUserId),
      is_deleted: false,
    });

    return responses.map((id) => id.toString());
  } catch (error: any) {
    logger.error('Error getting unique form IDs', {
      error: error.message,
      stack: error.stack,
      agentUserId,
    });
    return [];
  }
};

/**
 * Get response by ID with populated form and agent/admin details
 */
export const getResponseById = async (id: string): Promise<any> => {
  try {
    const pipeline: any[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: 'formdbs',
          localField: 'form_id',
          foreignField: '_id',
          as: 'form',
        },
      },
      { $unwind: '$form' },
      {
        $addFields: {
          'form.agents': {
            $map: {
              input: '$form.agents',
              in: { $toObjectId: '$$this' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'agentdbs',
          localField: 'form.agents',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      {
        $lookup: {
          from: 'agentdbs',
          localField: 'agent_user_id',
          foreignField: 'user_id',
          as: 'agentUser',
        },
      },
      {
        $lookup: {
          from: 'admindbs',
          localField: 'admin_user_id',
          foreignField: 'user_id',
          as: 'adminUser',
        },
      },
      {
        $addFields: {
          filledBy: {
            $cond: {
              if: { $eq: ['$agent_user_id', null] },
              then: { $arrayElemAt: ['$adminUser', 0] },
              else: { $arrayElemAt: ['$agentUser', 0] },
            },
          },
        },
      },
      {
        $project: {
          agentUser: 0,
          adminUser: 0,
        },
      },
    ];

    const results = await Response.aggregate(pipeline);
    return results.length > 0 ? results[0] : null;
  } catch (error: any) {
    logger.error('Error getting response by ID', {
      error: error.message,
      stack: error.stack,
      id,
    });
    return null;
  }
};

/**
 * Get responses by agent user ID
 */
export const getResponsesByAgentUserId = async (agentUserId: string): Promise<IResponse[]> => {
  try {
    const pipeline: any[] = [
      {
        $match: {
          agent_user_id: new mongoose.Types.ObjectId(agentUserId),
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: 'formdbs',
          localField: 'form_id',
          foreignField: '_id',
          as: 'form',
        },
      },
      { $unwind: '$form' },
      {
        $match: {
          'form.is_deleted': false,
        },
      },
    ];

    return await Response.aggregate(pipeline);
  } catch (error: any) {
    logger.error('Error getting responses by agent user ID', {
      error: error.message,
      stack: error.stack,
      agentUserId,
    });
    return [];
  }
};

/**
 * Get all form responses with location (GPS data)
 */
export const getAllFormResponsesWithLocation = async (): Promise<any[]> => {
  try {
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'formdbs',
          localField: 'form_id',
          foreignField: '_id',
          as: 'form',
        },
      },
      { $unwind: '$form' },
      {
        $match: {
          is_deleted: false,
          'form.is_deleted': false,
        },
      },
      {
        $addFields: {
          'form.agents': {
            $map: {
              input: '$form.agents',
              in: { $toObjectId: '$$this' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'agentdbs',
          localField: 'form.agents',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      {
        $match: {
          'form.fields.key': 'gps',
        },
      },
      {
        $lookup: {
          from: 'agentdbs',
          localField: 'agent_user_id',
          foreignField: 'user_id',
          as: 'agentUser',
        },
      },
      {
        $lookup: {
          from: 'admindbs',
          localField: 'admin_user_id',
          foreignField: 'user_id',
          as: 'adminUser',
        },
      },
      {
        $addFields: {
          filledBy: {
            $cond: {
              if: { $eq: ['$agent_user_id', null] },
              then: { $arrayElemAt: ['$adminUser', 0] },
              else: { $arrayElemAt: ['$agentUser', 0] },
            },
          },
        },
      },
      {
        $project: {
          agentUser: 0,
          adminUser: 0,
        },
      },
    ];

    return await Response.aggregate(pipeline);
  } catch (error: any) {
    logger.error('Error getting responses with location', {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

/**
 * Update response
 */
export const updateResponse = async (
  responseId: string,
  updateData: IResponseUpdateInput
): Promise<IResponse> => {
  try {
    const response = await Response.findById(responseId);

    if (!response) {
      throw new NotFoundError('Response not found');
    }

    Object.assign(response, updateData);
    await response.save();
    return response;
  } catch (error: any) {
    logger.error('Error updating response', {
      error: error.message,
      stack: error.stack,
      responseId,
    });
    throw error;
  }
};

/**
 * Get response analysis by user and response ID
 */
export const getResponseAnalysis = async (
  userId: string,
  responseId: string
): Promise<any | null> => {
  try {
    const pipeline: any[] = [
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          response_id: new mongoose.Types.ObjectId(responseId),
        },
      },
    ];

    const results = await ResponseAnalysis.aggregate(pipeline);
    return results.length > 0 ? results[0] : null;
  } catch (error: any) {
    logger.error('Error getting response analysis', {
      error: error.message,
      stack: error.stack,
      userId,
      responseId,
    });
    return null;
  }
};

/**
 * Add response analysis
 */
export const addResponseAnalysis = async (
  userId: string,
  responseId: string,
  analysisHistory: Array<{ role: string; content: string }>
): Promise<any> => {
  try {
    const analysisData: IResponseAnalysisCreateInput = {
      user_id: new mongoose.Types.ObjectId(userId),
      response_id: new mongoose.Types.ObjectId(responseId),
      analysisObject: analysisHistory,
    };

    return await ResponseAnalysis.create(analysisData);
  } catch (error: any) {
    logger.error('Error adding response analysis', {
      error: error.message,
      stack: error.stack,
      userId,
      responseId,
    });
    throw error;
  }
};

/**
 * Update response analysis
 */
export const updateResponseAnalysis = async (
  analysisId: string,
  analysisHistory: Array<{ role: string; content: string }>
): Promise<any> => {
  try {
    const analysis = await ResponseAnalysis.findById(analysisId);

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    const updateData: IResponseAnalysisUpdateInput = {
      analysisObject: analysisHistory,
    };

    Object.assign(analysis, updateData);
    await analysis.save();
    return analysis;
  } catch (error: any) {
    logger.error('Error updating response analysis', {
      error: error.message,
      stack: error.stack,
      analysisId,
    });
    throw error;
  }
};

/**
 * Delete response analysis
 */
export const deleteResponseAnalysis = async (analysisId: string): Promise<any> => {
  try {
    const analysis = await ResponseAnalysis.findById(analysisId);

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    await analysis.deleteOne();
    return analysis;
  } catch (error: any) {
    logger.error('Error deleting response analysis', {
      error: error.message,
      stack: error.stack,
      analysisId,
    });
    throw error;
  }
};

// Export service object
export const responseService = {
  getAllFormResponses,
  getMultipleResponseById,
  createResponse,
  createSingleResponse,
  getResponseByClientSubmissionId,
  getResponseCountByAgentUserId,
  getUniqueFormIdsByAgentUserId,
  getResponseById,
  getResponsesByAgentUserId,
  getAllFormResponsesWithLocation,
  updateResponse,
  getResponseAnalysis,
  addResponseAnalysis,
  updateResponseAnalysis,
  deleteResponseAnalysis,
};
