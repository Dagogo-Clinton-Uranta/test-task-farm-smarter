import { Request, Response, NextFunction } from 'express';
import { formService } from '../services/form.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/error.util.js';
import { IFormCreateInput, IFormUpdateInput, IFormGenerationInput } from '../interfaces/form.interface.js';
import { sendCSVResponse, sendCSVTemplate } from '../utils/csv.util.js';
import csv from 'csv-parser';
import fs from 'fs';
import { responseService } from '../services/response.service.js';
import { agentService } from '../services/agent.service.js';
import { createGetByIdHandler, createDeleteHandler, createUpdateHandler, createExistsCheckHandler } from '../utils/crud.handlers.js';
import { canAccessAllResources, isAgent, isAnyAdmin } from '../utils/role.util.js';

/**
 * Form Controller
 * Handles all form-related HTTP requests
 */

/**
 * Create a new form
 * POST /api/forms
 */
export const createForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    const formData: IFormCreateInput & { user_id: string } = {
      ...req.body,
      user_id: req.userId,
    };

    const form = await formService.createForm(formData as any);
    sendSuccess(res, form, 'Form created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate form with AI
 * POST /api/forms/generate
 */
export const generateForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { formAim = 'A random farmer form', numberOfQuestions = 10 }: IFormGenerationInput = req.body;

    // Limit to 15 questions max
    const questionCount = numberOfQuestions > 15 ? 15 : numberOfQuestions;

    // TODO: Implement AI service for form generation
    // For now, return a placeholder response
    // This should call an AI service (OpenAI) to generate form questions

    sendSuccess(res, {
      message: 'AI form generation not yet implemented',
      formAim,
      numberOfQuestions: questionCount,
    }, 'Form generation endpoint ready');
  } catch (error) {
    next(error);
  }
};

/**
 * Update a form
 * PUT /api/forms/:id
 */
export const updateForm = createUpdateHandler(
  (id: string, data: IFormUpdateInput) => formService.updateForm(id, data),
  'id',
  'Form updated successfully'
);

/**
 * Delete a form (soft delete)
 * DELETE /api/forms/:id
 */
export const deleteForm = createDeleteHandler(
  (id: string, data: any) => formService.updateForm(id, data),
  'id',
  'Form deleted successfully',
  async (req: Request, id: string) => {
    // Verify form exists before deleting
    await createExistsCheckHandler(formService.getFormById.bind(formService), id, 'Form');
  },
  { is_deleted: true }
);

/**
 * Get forms by role
 * GET /api/forms
 */
/**
 * Get forms by role
 * GET /api/forms
 *
 * Access Control:
 * - SuperAdmin: sees ALL forms
 * - Admin: sees public + own + shared forms
 * - Agent: sees forms assigned to them
 */
export const getFormsByRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware
    const withAgents = req.query.withAgents === 'true';
    let result: any[] = [];

    // SuperAdmin sees EVERYTHING
    if (canAccessAllResources(req.user!)) {
      result = await formService.queryForms(withAgents);
    }
    // Agent sees only forms assigned to them
    else if (isAgent(req.user!) && req.userId) {
      const agent = await agentService.getAgentByUserId(req.userId);
      if (agent) {
        result = await formService.getFormsByAgentId(agent._id.toString(), withAgents);
      }
    }
    // Regular Admin sees public + own + shared forms
    else if (req.userId) {
      const publicForms = await formService.getPublicForms(withAgents);
      const ownForms = await formService.getFormsByUserId(req.userId, withAgents);
      const sharedForms = await formService.getSharedForms(req.userId, withAgents);

      result = [...publicForms, ...ownForms, ...sharedForms];
      result = formService.removeDuplicatesById(result);
    }
    else {
      throw new UnauthorizedError('Insufficient permissions');
    }

    sendSuccess(res, result, 'Forms retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get form by ID
 * GET /api/forms/:id
 */
export const getForm = createGetByIdHandler(
  (id: string) => formService.getFormById(id, true),
  'id',
  'Form retrieved successfully'
);

/**
 * Get forms by agent ID
 * GET /api/forms/agent/:agentId
 */
export const getFormsByAgentId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // agentId is guaranteed by validateParam middleware
    const agentId = req.params.agentId!;
    const result = await formService.getFormsByAgentId(agentId);
    sendSuccess(res, result, 'Forms retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer form
 * GET /api/forms/farmer
 * 
 * Returns the farmer registration form (isFarmerForm: true)
 * This form is public and accessible to all authenticated users
 */
export const getFarmerForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const farmerForm = await formService.getFarmerForm();
    
    if (!farmerForm) {
      throw new NotFoundError('Farmer form not found. Please ensure a farmer form is configured.');
    }
    
    sendSuccess(res, farmerForm, 'Farmer form retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get agents attached to a form
 * GET /api/forms/:id/agents
 */
export const getAgentsAttachedToForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    const form = await formService.getAgentsAttachedToForm(formId);

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    sendSuccess(res, form, 'Agents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get form responses
 * GET /api/forms/:id/responses
 */
export const getFormResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    let form: any = null;

    // Admin (Super or Regular) gets all responses for the form
    if (isAnyAdmin(req.user!)) {
      form = await formService.getFormResponses(formId);
    }
    // Agent gets only their responses for the form
    else if (isAgent(req.user!) && req.userId) {
      form = await formService.getAgentFormResponses(formId, req.userId);
    }
    else {
      throw new ForbiddenError('Insufficient permissions');
    }

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    sendSuccess(res, form, 'Form responses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all form responses
 * GET /api/forms/responses
 */
export const getAllFormResponses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware
    let responses: any[] = [];

    // SuperAdmin sees ALL responses
    if (canAccessAllResources(req.user!)) {
      responses = await responseService.getAllFormResponses();
    }
    // Regular Admin sees only responses from agents they created
    else if (isAnyAdmin(req.user!)) {
      const userAgents = await agentService.getAgentsByCreatorId(req.userId!);
      const agentUserIds = userAgents
        .map((agent: any) => agent.user_id?._id?.toString() || agent.user_id?.toString())
        .filter(Boolean);

      const allResponses = await responseService.getAllFormResponses();
      responses = allResponses.filter((response: any) => {
        const responseAgentUserId = response.agent_user_id?.toString();
        return responseAgentUserId && agentUserIds.includes(responseAgentUserId);
      });
    }
    else {
      throw new ForbiddenError('Insufficient permissions');
    }

    sendSuccess(res, responses, 'Form responses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Generate CSV template for form input
 * GET /api/forms/:id/csv-template
 */
export const generateFormInputCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    const form = await formService.getFormById(formId);

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    const formFields = (form as any).fields || [];
    const filename = `${(form as any).title || 'form'}-response-format.csv`;

    sendCSVTemplate(res, formFields, filename);
  } catch (error) {
    next(error);
  }
};

/**
 * Export form responses to CSV
 * GET /api/forms/:id/export-csv
 */
export const exportFormResponsesCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    const form = await formService.getFormResponses(formId);

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    const formResponses = (form as any).responses || [];
    const formFields = (form as any).fields || [];
    const filename = `${(form as any).title || 'form'}-responses.csv`;

    sendCSVResponse(res, formFields, formResponses, filename);
  } catch (error) {
    next(error);
  }
};

/**
 * Export selected form responses to CSV
 * POST /api/forms/:id/export-selected
 */
export const exportSelectedFormResponsesCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    const { responses: selectedResponses } = req.body;

    if (!selectedResponses || !Array.isArray(selectedResponses) || selectedResponses.length === 0) {
      throw new BadRequestError('Responses array is required');
    }

    const responses = await responseService.getMultipleResponseById(selectedResponses);

    if (responses.length === 0) {
      throw new NotFoundError('No responses found');
    }

    // Get form to access fields
    const form = await formService.getFormById(formId);
    if (!form) {
      throw new NotFoundError('Form not found');
    }

    // Verify all responses belong to the same form
    const invalidResponses = responses.filter(
      (response: any) => response.form_id.toString() !== formId
    );

    if (invalidResponses.length > 0) {
      throw new BadRequestError('Some responses do not belong to the specified form');
    }

    const formFields = (form as any).fields || [];
    const formTitle = (form as any).title || 'form';
    const filename = `${formTitle}-responses.csv`;

    sendCSVResponse(res, formFields, responses, filename);
  } catch (error) {
    next(error);
  }
};

/**
 * Import responses from CSV
 * POST /api/forms/:id/import-csv
 */
export const importResponsesFromCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // formId is guaranteed by validateParam middleware
    const formId = req.params.id!;
    const csvFile = req.file;

    if (!csvFile) {
      throw new BadRequestError('CSV file is required');
    }

    const form = await formService.getFormById(formId);

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    const formFields = (form as any).fields || [];
    const results: any[] = [];

    // Parse CSV file
    fs.createReadStream(csvFile.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          const responseObjects: any[] = [];
          let shouldContinue = true;

          results.forEach((result) => {
            if (!shouldContinue) {
              return;
            }

            const formKeys = Object.keys(result);
            const responseInput: any = {
              form_id: formId,
              agent_user_id: null,
              admin_user_id: req.userId,
            };

            const responseObject: Record<string, any> = {};

            formKeys.forEach((key) => {
              const field = formFields.find((f: any) => f.name === key);

              if (!field) {
                shouldContinue = false;
                return;
              }

              responseObject[field.name] = result[key];
            });

            if (shouldContinue) {
              responseInput.responseObject = responseObject;
              responseObjects.push(responseInput);
            }
          });

          if (responseObjects.length === 0) {
            // Delete the file
            fs.unlinkSync(csvFile.path);
            throw new BadRequestError('Empty CSV file');
          }

          if (!shouldContinue) {
            // Delete the file
            fs.unlinkSync(csvFile.path);
            throw new BadRequestError('Invalid CSV file - fields do not match form');
          }

          // Create responses
          const responses = await responseService.createResponse(responseObjects);

          // Delete the file
          fs.unlinkSync(csvFile.path);

          sendSuccess(res, responses, 'Responses imported successfully');
        } catch (error) {
          // Delete the file on error
          if (fs.existsSync(csvFile.path)) {
            fs.unlinkSync(csvFile.path);
          }
          next(error);
        }
      })
      .on('error', (error) => {
        // Delete the file on error
        if (fs.existsSync(csvFile.path)) {
          fs.unlinkSync(csvFile.path);
        }
        next(new BadRequestError(`Error parsing CSV: ${error.message}`));
      });
  } catch (error) {
    next(error);
  }
};
