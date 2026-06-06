import { Router } from 'express';
import {
  createResponse,
  syncBatchResponses,
  getResponseById,
  getAgentResponses,
  getResponsesWithLocation,
  analyzeResponse,
  getResponseAnalysis,
  deleteResponseAnalysis,
  updateResponseObject,
  deleteResponse,
} from '../controllers/response.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Response Routes
 * Base path: /api/responses
 */

/**
 * @swagger
 * /responses:
 *   post:
 *     summary: Create a new response
 *     description: Creates a new form response. Sets agent_user_id or admin_user_id based on user role.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responseObject
 *               - form_id
 *             properties:
 *               responseObject:
 *                 type: object
 *                 description: Dynamic response data matching form fields
 *               form_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Response created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, createResponse);
router.post('/sync/batch', authenticate, syncBatchResponses);

/**
 * @swagger
 * /responses/withLocation:
 *   get:
 *     summary: Get responses with location (GPS)
 *     description: Retrieves all responses that have GPS/location data. Admins see only their agents' responses.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Responses with location retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/withLocation', authenticate, getResponsesWithLocation);

/**
 * @swagger
 * /responses/{id}/analyse:
 *   post:
 *     summary: Analyze response with AI
 *     description: Analyzes a response using AI. Creates or updates analysis chat history.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newChat:
 *                 type: boolean
 *                 description: "Start a new chat (default: false)"
 *     responses:
 *       200:
 *         description: Response analyzed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Response not found
 */
router.post('/:id/analyse', authenticate, validateParam('id', 'Response ID is required'), analyzeResponse);

/**
 * @swagger
 * /responses/{id}/analysis:
 *   get:
 *     summary: Get response analysis
 *     description: Retrieves AI analysis chat history for a response.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analysis retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/analysis', authenticate, validateParam('id', 'Response ID is required'), getResponseAnalysis);

/**
 * @swagger
 * /responses/{id}/analysis:
 *   delete:
 *     summary: Delete response analysis
 *     description: Deletes AI analysis chat history for a response.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Analysis deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Analysis not found
 */
router.delete('/:id/analysis', authenticate, validateParam('id', 'Response ID is required'), deleteResponseAnalysis);

/**
 * @swagger
 * /responses/{id}/update-response:
 *   put:
 *     summary: Update response object
 *     description: Updates the responseObject field of a response.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responseObject
 *             properties:
 *               responseObject:
 *                 type: object
 *     responses:
 *       200:
 *         description: Response updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Response not found
 */
router.put('/:id/update-response', authenticate, validateParam('id', 'Response ID is required'), updateResponseObject);

/**
 * @swagger
 * /responses/{id}/delete-response:
 *   delete:
 *     summary: Delete response (soft delete)
 *     description: Soft deletes a response by setting is_deleted=true.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Response deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Response not found
 */
router.delete('/:id/delete-response', authenticate, validateParam('id', 'Response ID is required'), deleteResponse);

/**
 * @swagger
 * /responses/agent/{agent_id}:
 *   get:
 *     summary: Get responses by agent ID
 *     description: Retrieves all responses submitted by a specific agent.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID (not user ID)
 *     responses:
 *       200:
 *         description: Agent responses retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 */
router.get('/agent/:agent_id', authenticate, validateParam('agent_id', 'Agent ID is required'), getAgentResponses);

/**
 * @swagger
 * /responses/{id}:
 *   get:
 *     summary: Get response by ID
 *     description: Retrieves a response with populated form and agent/admin details.
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Response not found
 */
router.get('/:id', authenticate, validateParam('id', 'Response ID is required'), getResponseById);

export default router;
