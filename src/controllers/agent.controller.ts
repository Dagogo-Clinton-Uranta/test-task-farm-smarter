import { Request, Response, NextFunction } from 'express';
import { agentService } from '../services/agent.service.js';
import { userService } from '../services/user.service.js';
import { formService } from '../services/form.service.js';
import { responseService } from '../services/response.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../utils/error.util.js';
import { IAgentCreateInput, IAgentUpdateInput } from '../interfaces/agent.interface.js';
import { createGetByIdHandler, createUpdateHandler, createDeleteHandler, createExistsCheckHandler } from '../utils/crud.handlers.js';
import { createEntityWithUser } from '../utils/creation.handlers.js';
import { logger } from '../utils/logger.js';
import { isSuperAdmin, canAccessAllResources } from '../utils/role.util.js';

/**
 * Agent Controller
 * Handles all agent-related HTTP requests
 */

/**
 * Create a new agent
 * POST /api/agents
 */
export const createAgent = createEntityWithUser({
  role: 'agent',
  roleDisplayName: 'Agent',
  profileService: {
    getByUserId: agentService.getAgentByUserId.bind(agentService),
    updateById: agentService.updateAgentById.bind(agentService),
    create: agentService.createAgent.bind(agentService),
  },
  buildProfileData: (req: Request, userId: any): IAgentCreateInput => ({
    user_id: userId,
    created_by: req.userId as any,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    location: req.body.location,
  }),
  getProfileId: (profile: any) => profile._id.toString(),
});

/**
 * Edit/Update an agent
 * PUT /api/agents/:id
 */
export const editAgent = createUpdateHandler(
  (id: string, data: IAgentUpdateInput) => agentService.updateAgentById(id, data),
  'id',
  'Agent updated successfully',
  204,
  async (req: Request, id: string) => {
    // Verify agent exists before updating
    await createExistsCheckHandler(agentService.getAgentById.bind(agentService), id, 'Agent');
  },
  (req: Request): IAgentUpdateInput => ({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    location: req.body.location,
    phoneNumber: req.body.phoneNumber,
    created_by: req.body.adminId || req.userId as any,
  })
);

/**
 * Get all agents (by role)
 * GET /api/agents
 *
 * Access Control:
 * - SuperAdmin: sees ALL agents
 * - Admin: sees only agents they created
 */
export const getAgents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware
    let result: any[] = [];

    logger.info(`Getting agents for user: ${req.user!.role} (userId: ${req.userId})`);

    // SuperAdmin sees EVERYTHING
    if (canAccessAllResources(req.user!)) {
      result = await agentService.queryAgents();
    }
    // Regular Admin sees only agents they created
    else if (req.userId) {
      result = await agentService.getAgentsByCreatorId(req.userId);
    }
    else {
      throw new UnauthorizedError('Insufficient permissions');
    }

    sendSuccess(res, result, 'Agents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent by ID
 * GET /api/agents/:id
 */
export const getAgent = createGetByIdHandler(
  agentService.getAgentById.bind(agentService),
  'id',
  'Agent retrieved successfully'
);

/**
 * Get agent forms
 * GET /api/agents/forms
 */
export const getAgentForms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    const forms = await agentService.getFormsAssignedToAgent(req.userId!);

    sendSuccess(res, forms, 'Agent forms retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Attach form to agent
 * GET /api/agents/:id/attach-form?agent_id=xxx
 */
export const attachFormToAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // formId and agentId are guaranteed by validateParam/validateQuery middleware
    const formId = req.params.id!;
    const agentId = req.query.agent_id as string;

    const form = await formService.addAgentToForm(formId, agentId);

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    sendSuccess(res, form, 'Form attached to agent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent statistics
 * GET /api/agents/:agent_id/stats
 */
export const getAgentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // agentId is guaranteed by validateParam middleware
    const agentId = req.params.agent_id!;

    const agent = await agentService.getAgentById(agentId);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const agentUserId = (agent.user_id as any)?._id?.toString() || (agent.user_id as any)?.toString();

    if (!agentUserId) {
      throw new NotFoundError('Agent user ID not found');
    }

    const totalAssignedForm = await formService.getAgentFormsCount(agentId);
    const totalResponses = await responseService.getResponseCountByAgentUserId(agentUserId);

    // Calculate totalFilled: number of unique forms the agent has responded to
    const uniqueFormIds = await responseService.getUniqueFormIdsByAgentUserId(agentUserId);
    const totalFilled = uniqueFormIds.length;

    const result = {
      totalAssigned: totalAssignedForm,
      totalResponses: totalResponses,
      totalFilled,
    };

    sendSuccess(res, result, 'Agent statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete agent by ID
 * DELETE /api/agents/:id
 */
export const deleteAgent = createDeleteHandler(
  agentService.deleteAgentById.bind(agentService),
  'id',
  'Agent deleted successfully',
  async (req: Request, id: string) => {
    // Verify agent exists before deleting
    await createExistsCheckHandler(agentService.getAgentById.bind(agentService), id, 'Agent');
  }
);
