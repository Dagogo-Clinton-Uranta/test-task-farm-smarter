import mongoose from 'mongoose';
import { Agent } from '../models/agent.model.js';
import { NotFoundError } from '../utils/error.util.js';
import { IAgent, IAgentCreateInput, IAgentUpdateInput, IAgentWithDetails } from '../interfaces/agent.interface.js';

/**
 * Agent Service
 * Handles all agent-related business logic including aggregation pipelines
 */

/**
 * Get base pipeline for agent aggregation
 * Includes user lookup, forms, and responses
 */
const getBaseAgentPipeline = (): any[] => {
  return [
    {
      $addFields: {
        id: {
          $toString: '$_id',
        },
      },
    },
    {
      $lookup: {
        from: 'formdbs',
        localField: 'id',
        foreignField: 'agents',
        as: 'forms',
      },
    },
    {
      $lookup: {
        from: 'responsesdbs',
        let: { agentUserId: '$user_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$agent_user_id', '$$agentUserId'] },
                  { $eq: ['$is_deleted', false] },
                ],
              },
            },
          },
          { $project: { _id: 1, form_id: 1, createdAt: 1 } },
        ],
        as: 'responses',
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
    {
      $match: {
        'user.is_active': { $ne: false },
      },
    },
    { $unset: 'user.passWord' },
    { $unset: 'user.password' },
  ];
};

/**
 * Create a new agent
 */
export const createAgent = async (agentData: IAgentCreateInput): Promise<IAgent> => {
  const agent = new Agent(agentData);
  return await agent.save();
};

/**
 * Get agent by ID
 */
export const getAgentById = async (id: string): Promise<IAgent | null> => {
  return await Agent.findById(id).populate({
    path: 'user_id',
    select: '-passWord -password',
  });
};

/**
 * Get agent by user ID
 */
export const getAgentByUserId = async (userId: string): Promise<IAgent | null> => {
  return await Agent.findOne({ user_id: userId });
};

/**
 * Update agent by ID
 */
export const updateAgentById = async (agentId: string, updateData: IAgentUpdateInput): Promise<IAgent> => {
  const agent = await Agent.findById(agentId);

  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  Object.assign(agent, updateData);
  await agent.save();
  return agent;
};

/**
 * Query all agents (for Super Admin)
 */
export const queryAgents = async (): Promise<IAgentWithDetails[]> => {
  const pipeline = getBaseAgentPipeline();
  return await Agent.aggregate(pipeline).allowDiskUse(true);
};

/**
 * Get agents by creator ID (for Admin)
 */
export const getAgentsByCreatorId = async (creatorUserId: string): Promise<IAgentWithDetails[]> => {
  const pipeline: any[] = [
    {
      $match: {
        created_by: new mongoose.Types.ObjectId(creatorUserId),
      },
    },
    ...getBaseAgentPipeline(),
  ];

  return await Agent.aggregate(pipeline).allowDiskUse(true);
};

/**
 * Get forms assigned to agent
 */
export const getFormsAssignedToAgent = async (agentUserId: string): Promise<any[]> => {
  // First get the agent by user_id
  const agent = await Agent.findOne({ user_id: agentUserId });

  if (!agent) {
    return [];
  }

  // Get forms where this agent is in the agents array
  const { formService } = await import('./form.service.js');
  return await formService.getFormsByAgentId(agent._id.toString());
};

/**
 * Delete agent by ID
 */
export const deleteAgentById = async (agentId: string): Promise<IAgent> => {
  const agent = await Agent.findById(agentId);

  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  await agent.deleteOne();
  return agent;
};

// Export service object
export const agentService = {
  createAgent,
  getAgentById,
  getAgentByUserId,
  updateAgentById,
  queryAgents,
  getAgentsByCreatorId,
  getFormsAssignedToAgent,
  deleteAgentById,
};
