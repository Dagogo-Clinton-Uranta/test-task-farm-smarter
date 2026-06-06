import { Request, Response, NextFunction } from 'express';
import { responseService } from '../services/response.service.js';
import { formService } from '../services/form.service.js';
import { agentService } from '../services/agent.service.js';
import { formDataExtractionService } from '../services/form-data-extraction.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/error.util.js';
import { IResponseCreateInput } from '../interfaces/response.interface.js';
import { logger } from '../utils/logger.js';
import { createGetByIdHandler, createDeleteHandler } from '../utils/crud.handlers.js';
import { isAnyAdmin, isAgent, isRetailer, canAccessAllResources } from '../utils/role.util.js';

type BatchSyncStatus = 'synced' | 'duplicate' | 'invalid_form_version' | 'validation_error';

interface BatchSyncResult {
  clientSubmissionId: string;
  status: BatchSyncStatus;
  responseId?: string;
  message?: string;
}

const normalizeResponsePayload = (
  req: Request,
  body: any
): { responseData: IResponseCreateInput; responseObject: Record<string, any>; formId: string } => {
  const { responseObject, form_id, clientSubmissionId, formVersion, submittedAtClient, attachmentsMeta } = body || {};

  if (!responseObject || !form_id) {
    throw new BadRequestError('responseObject and form_id are required');
  }

  const responseData: IResponseCreateInput = {
    responseObject,
    form_id: form_id as any,
    client_submission_id: clientSubmissionId,
    form_version: typeof formVersion === 'number' ? formVersion : undefined,
    submitted_at_client: submittedAtClient ? new Date(submittedAtClient) : undefined,
    attachments_meta: attachmentsMeta,
    agent_user_id: null,
    admin_user_id: null,
  };

  if (isAnyAdmin(req.user!)) {
    responseData.admin_user_id = req.userId as any;
  } else if (isAgent(req.user!)) {
    responseData.agent_user_id = req.userId as any;
  } else if (isRetailer(req.user!)) {
    responseData.admin_user_id = req.userId as any;
  }

  return { responseData, responseObject, formId: form_id };
};

/**
 * Response Controller
 * Handles all response-related HTTP requests
 */

/**
 * Create a new response
 * POST /api/responses
 */
export const createResponse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId and req.user are guaranteed by authenticate middleware
    const { responseData, responseObject } = normalizeResponsePayload(req, req.body);

    if (responseData.client_submission_id && responseData.agent_user_id) {
      const existingResponse = await responseService.getResponseByClientSubmissionId(
        responseData.agent_user_id.toString(),
        responseData.client_submission_id
      );

      if (existingResponse) {
        sendSuccess(res, [existingResponse], 'Duplicate submission ignored; existing response returned');
        return;
      }
    }

    // Create response
    const formResponse:any = await responseService.createResponse([responseData]);

    if (!formResponse || formResponse.length === 0) {
      throw new BadRequestError('Response not successfully created');
    }

    // Add OriginalResponseId to responseObject (for farmer creation)
    if (formResponse[0] && formResponse[0]._id) {
      responseObject.OriginalResponseId = formResponse[0]._id.toString();
    }

    // Extract farmer data if this is a farmer form response
    try {
      await formDataExtractionService.extractFormDataFromResponse(
        formResponse[0]._id.toString()
      );
    } catch (extractionError: any) {
      // Log error but don't fail the response creation
      logger.error('Error extracting farmer data from response', {
        error: extractionError.message,
        responseId: formResponse[0]._id.toString(),
      });
    }

    sendSuccess(res, formResponse, 'Response created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Sync responses in batch (offline queue drain)
 * POST /api/responses/sync/batch
 */
export const syncBatchResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const responses = Array.isArray(req.body?.responses) ? req.body.responses : null;

    if (!responses || responses.length === 0) {
      throw new BadRequestError('responses array is required');
    }

    const results: BatchSyncResult[] = [];

    for (const item of responses) {
      const clientSubmissionId = item?.clientSubmissionId;

      if (!clientSubmissionId || !item?.form_id || !item?.responseObject) {
        results.push({
          clientSubmissionId: clientSubmissionId || 'unknown',
          status: 'validation_error',
          message: 'clientSubmissionId, form_id and responseObject are required',
        });
        continue;
      }

      try {
        const { responseData, responseObject, formId } = normalizeResponsePayload(req, item);

        if (responseData.agent_user_id) {
          const existing = await responseService.getResponseByClientSubmissionId(
            responseData.agent_user_id.toString(),
            clientSubmissionId
          );

          if (existing) {
            results.push({
              clientSubmissionId,
              status: 'duplicate',
              responseId: existing._id.toString(),
              message: 'Duplicate submission',
            });
            continue;
          }
        }

        const form = await formService.getFormById(formId);
        if (!form) {
          results.push({
            clientSubmissionId,
            status: 'validation_error',
            message: 'Form not found',
          });
          continue;
        }

        const formVersion = (form as any).version;
        if (typeof responseData.form_version === 'number' && typeof formVersion === 'number') {
          if (responseData.form_version > formVersion) {
            results.push({
              clientSubmissionId,
              status: 'invalid_form_version',
              message: `Form version ${responseData.form_version} is not supported`,
            });
            continue;
          }
        }

        const created = await responseService.createSingleResponse(responseData);

        if (created && created._id) {
          responseObject.OriginalResponseId = created._id.toString();
          try {
            await formDataExtractionService.extractFormDataFromResponse(created._id.toString());
          } catch (extractionError: any) {
            logger.error('Error extracting farmer data from batch synced response', {
              error: extractionError.message,
              responseId: created._id.toString(),
            });
          }
        }

        results.push({
          clientSubmissionId,
          status: 'synced',
          responseId: created._id.toString(),
          message: 'Synced',
        });
      } catch (error) {
        results.push({
          clientSubmissionId,
          status: 'validation_error',
          message: error instanceof Error ? error.message : 'Failed to sync response',
        });
      }
    }

    sendSuccess(res, results, 'Batch sync processed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get response by ID
 * GET /api/responses/:id
 */
export const getResponseById = createGetByIdHandler(
  responseService.getResponseById.bind(responseService),
  'id',
  'Response retrieved successfully'
);

/**
 * Get responses by agent ID
 * GET /api/responses/agent/:agent_id
 */
export const getAgentResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // agentId is guaranteed by validateParam middleware
    const agentId = req.params.agent_id!;

    // Get agent to find user_id
    const agent = await agentService.getAgentById(agentId);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const agentUserId = (agent as any).user_id?.toString() || (agent as any).user_id?._id?.toString();

    if (!agentUserId) {
      throw new NotFoundError('Agent user ID not found');
    }

    const responses = await responseService.getResponsesByAgentUserId(agentUserId);

    sendSuccess(res, responses, 'Agent responses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get responses with location (GPS data)
 * GET /api/responses/withLocation
 */
export const getResponsesWithLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId and req.user are guaranteed by authenticate middleware
    let responses = await responseService.getAllFormResponsesWithLocation();

    // SuperAdmin sees ALL locations
    if (canAccessAllResources(req.user!)) {
      // No filtering needed
    }
    // Admin filters by their agents
    else if (isAnyAdmin(req.user!)) {
      const userAgents = await agentService.getAgentsByCreatorId(req.userId!);
      const agentIds = userAgents.map((agent: any) => agent._id.toString().trim());
      responses = responses.filter((response: any) => {
        const filledById = response.filledBy?._id?.toString().trim();
        return agentIds.includes(filledById);
      });
    }
    // Agent filters by their own submissions
    else if (isAgent(req.user!)) {
      responses = responses.filter((response: any) => {
        return response.agent_user_id?.toString() === req.userId;
      });
    }
    else {
      throw new ForbiddenError('Insufficient permissions');
    }

    sendSuccess(res, responses, 'Responses with location retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze response (AI)
 * POST /api/responses/:id/analyse
 */
export const analyzeResponse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // responseId is guaranteed by validateParam middleware
    const responseId = req.params.id!;

    const response = await responseService.getResponseById(responseId);

    if (!response) {
      throw new NotFoundError('Response not found');
    }

    const formFields = (response as any).form?.fields || [];
    const { responseObject } = response;

    // Convert response to readable format
    const formKeys = Object.keys(responseObject);
    const readableResponse: Array<{ Question: string; Answer: any }> = [];

    formKeys.forEach((key) => {
      const field = formFields.find((f: any) => f.name === key);
      if (field) {
        readableResponse.push({
          Question: field.prompt || key,
          Answer: responseObject[key],
        });
      }
    });

    // Get existing analysis
    const existingAnalysis = await responseService.getResponseAnalysis(req.userId!, responseId);
    const newChat = req.body.newChat || false;

    // TODO: Implement OpenAI integration
    // For now, return a placeholder response
    logger.warn('AI analysis not yet implemented - returning placeholder', {
      responseId,
      userId: req.userId,
    });

    // Placeholder AI response
    const intelligentResponse = [
      {
        role: 'assistant',
        content: 'AI analysis feature is not yet implemented. This is a placeholder response.',
      },
    ];

    if (!existingAnalysis) {
      // Create new analysis
      await responseService.addResponseAnalysis(req.userId!, responseId, intelligentResponse);
    } else {
      // Update existing analysis
      const updatedHistory = existingAnalysis.analysisObject || [];
      if (newChat) {
        // Start new chat
        await responseService.updateResponseAnalysis(existingAnalysis._id.toString(), intelligentResponse);
      } else {
        // Continue existing chat
        updatedHistory.push(...intelligentResponse);
        await responseService.updateResponseAnalysis(existingAnalysis._id.toString(), updatedHistory);
      }
    }

    // Filter out system messages
    const filteredResponse = intelligentResponse.filter((r) => r.role !== 'system');

    sendSuccess(res, filteredResponse, 'Response analyzed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get response analysis
 * GET /api/responses/:id/analysis
 */
export const getResponseAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // responseId is guaranteed by validateParam middleware
    const responseId = req.params.id!;

    const existingAnalysis = await responseService.getResponseAnalysis(req.userId!, responseId);

    if (!existingAnalysis) {
      sendSuccess(res, [], 'No analysis found');
      return;
    }

    // Filter out system messages
    const filteredAnalysis = (existingAnalysis.analysisObject || []).filter(
      (r: any) => r.role !== 'system'
    );

    sendSuccess(res, filteredAnalysis, 'Response analysis retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete response analysis
 * DELETE /api/responses/:id/analysis
 */
export const deleteResponseAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // responseId is guaranteed by validateParam middleware
    const responseId = req.params.id!;

    const existingAnalysis = await responseService.getResponseAnalysis(req.userId!, responseId);

    if (!existingAnalysis) {
      throw new NotFoundError('Analysis chat not found');
    }

    await responseService.deleteResponseAnalysis(existingAnalysis._id.toString());

    sendSuccess(res, null, 'Analysis chat deleted successfully', 204);
  } catch (error) {
    next(error);
  }
};

/**
 * Update response object
 * PUT /api/responses/:id/update-response
 */
export const updateResponseObject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { responseObject } = req.body;
    if (!responseObject) {
      throw new BadRequestError('responseObject is required');
    }

    const responseId = req.params.id!;
    const updatedResponse = await responseService.updateResponse(responseId, {
      responseObject,
      last_updated_by: req.userId as any,
    });

    // Extract farmer data if this is a farmer form response
    try {
      await formDataExtractionService.extractFormDataFromResponse(responseId);
    } catch (extractionError: any) {
      // Log error but don't fail the response update
      logger.error('Error extracting farmer data from updated response', {
        error: extractionError.message,
        responseId,
      });
    }

    sendSuccess(res, updatedResponse, 'Response updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete response (soft delete)
 * DELETE /api/responses/:id/delete-response
 */
export const deleteResponse = createDeleteHandler(
  (id: string, data: any) => responseService.updateResponse(id, data),
  'id',
  'Response deleted successfully',
  undefined,
  (req: Request) => ({
    is_deleted: true,
    last_updated_by: req.userId as any,
  })
);
