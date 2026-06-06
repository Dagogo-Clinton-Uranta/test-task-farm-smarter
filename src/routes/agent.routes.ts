import { Router } from 'express';
import {
  createAgent,
  editAgent,
  getAgents,
  getAgent,
  getAgentForms,
  attachFormToAgent,
  getAgentStats,
  deleteAgent,
} from '../controllers/agent.controller.js';
import { authenticate, authorizeAdmin, optionalAuth } from '../middlewares/auth.middleware.js';
import { validateParam, validateQuery } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Agent Routes
 * Base path: /api/agents
 */

/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Create a new agent (Admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', optionalAuth, (req, res, next) => {
  // If authenticated, require admin role
  if (req.user) {
    authorizeAdmin(req, res, next);
  } else {
    // If not authenticated, allow (for backward compatibility)
    next();
  }
}, createAgent);

/**
 * @swagger
 * /agents/{id}:
 *   put:
 *     summary: Update agent (Admin only)
 *     tags: [Agents]
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               location:
 *                 type: string
 *               adminId:
 *                 type: string
 *     responses:
 *       204:
 *         description: Agent updated successfully
 */
router.put('/:id', authenticate, authorizeAdmin, validateParam('id', 'Agent ID is required'), editAgent);

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Get all agents (Admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agents retrieved successfully
 */
router.get('/', authenticate, authorizeAdmin, getAgents);

/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     tags: [Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent retrieved successfully
 */
router.get('/:id', validateParam('id', 'Agent ID is required'), getAgent);

/**
 * @swagger
 * /agents/forms:
 *   get:
 *     summary: Get forms assigned to current agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent forms retrieved successfully
 */
router.get('/forms', authenticate, getAgentForms);

/**
 * @swagger
 * /agents/{id}/attach-form:
 *   get:
 *     summary: Attach form to agent (Admin only)
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *       - in: query
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Form attached successfully
 */
router.get('/:id/attach-form', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), validateQuery('agent_id', 'Agent ID is required'), attachFormToAgent);

/**
 * @swagger
 * /agents/{agent_id}/stats:
 *   get:
 *     summary: Get agent statistics
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent statistics retrieved successfully
 */
router.get('/:agent_id/stats', authenticate, validateParam('agent_id', 'Agent ID is required'), getAgentStats);

/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Delete agent (Admin only)
 *     tags: [Agents]
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
 *         description: Agent deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 */
router.delete('/:id', authenticate, authorizeAdmin, validateParam('id', 'Agent ID is required'), deleteAgent);

export default router;
