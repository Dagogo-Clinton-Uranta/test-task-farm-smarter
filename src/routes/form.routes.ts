import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  createForm,
  generateForm,
  updateForm,
  deleteForm,
  getFormsByRole,
  getForm,
  getFormsByAgentId,
  getFarmerForm,
  getAgentsAttachedToForm,
  getFormResponses,
  getAllFormResponses,
  generateFormInputCSV,
  exportFormResponsesCSV,
  exportSelectedFormResponsesCSV,
  importResponsesFromCSV,
} from '../controllers/form.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Form Routes
 * Base path: /api/forms
 */

// Multer configuration for CSV upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads');
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/**
 * @swagger
 * /forms:
 *   post:
 *     summary: Create a new form (Admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *               - isPublic
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *               isPublic:
 *                 type: boolean
 *               agents:
 *                 type: array
 *                 items:
 *                   type: string
 *               sharedWith:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Form created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, authorizeAdmin, createForm);

/**
 * @swagger
 * /forms/generate:
 *   post:
 *     summary: Generate form with AI (Admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formAim:
 *                 type: string
 *               numberOfQuestions:
 *                 type: number
 *     responses:
 *       200:
 *         description: Form generated successfully
 */
router.post('/generate', authenticate, authorizeAdmin, generateForm);

/**
 * @swagger
 * /forms:
 *   get:
 *     summary: Get forms by role
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: withAgents
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Forms retrieved successfully
 */
router.get('/', authenticate, getFormsByRole);

/**
 * @swagger
 * /forms/farmer:
 *   get:
 *     summary: Get farmer registration form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     description: "Returns the public farmer registration form (isFarmerForm: true). Accessible to all authenticated users."
 *     responses:
 *       200:
 *         description: Farmer form retrieved successfully
 *       404:
 *         description: Farmer form not found
 */
router.get('/farmer', authenticate, getFarmerForm);

/**
 * @swagger
 * /forms/responses:
 *   get:
 *     summary: Get all form responses
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Responses retrieved successfully
 */
router.get('/responses', authenticate, getAllFormResponses);

/**
 * @swagger
 * /forms/agent/{agentId}:
 *   get:
 *     summary: Get forms by agent ID (Admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Forms retrieved successfully
 */
router.get('/agent/:agentId', authenticate, authorizeAdmin, validateParam('agentId', 'Agent ID is required'), getFormsByAgentId);

/**
 * @swagger
 * /forms/{id}:
 *   get:
 *     summary: Get form by ID
 *     tags: [Forms]
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
 *         description: Form retrieved successfully
 */
router.get('/:id', authenticate, validateParam('id', 'Form ID is required'), getForm);

/**
 * @swagger
 * /forms/{id}:
 *   put:
 *     summary: Update form (Admin only)
 *     tags: [Forms]
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
 *         description: Form updated successfully
 */
router.put('/:id', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), updateForm);

/**
 * @swagger
 * /forms/{id}:
 *   delete:
 *     summary: Delete form (Admin only)
 *     tags: [Forms]
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
 *         description: Form deleted successfully
 */
router.delete('/:id', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), deleteForm);

/**
 * @swagger
 * /forms/{id}/agents:
 *   get:
 *     summary: Get agents attached to form (Admin only)
 *     tags: [Forms]
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
 *         description: Agents retrieved successfully
 */
router.get('/:id/agents', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), getAgentsAttachedToForm);

/**
 * @swagger
 * /forms/{id}/responses:
 *   get:
 *     summary: Get form responses
 *     tags: [Forms]
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
 *         description: Form responses retrieved successfully
 */
router.get('/:id/responses', authenticate, validateParam('id', 'Form ID is required'), getFormResponses);

/**
 * @swagger
 * /forms/{id}/csv-template:
 *   get:
 *     summary: Download CSV template for form input (Admin only)
 *     tags: [Forms]
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
 *         description: CSV template downloaded
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/:id/csv-template', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), generateFormInputCSV);

/**
 * @swagger
 * /forms/{id}/export-csv:
 *   get:
 *     summary: Export form responses to CSV (Admin only)
 *     tags: [Forms]
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
 *         description: CSV exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/:id/export-csv', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), exportFormResponsesCSV);

/**
 * @swagger
 * /forms/{id}/export-selected:
 *   post:
 *     summary: Export selected form responses to CSV (Admin only)
 *     tags: [Forms]
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
 *               - responses
 *             properties:
 *               responses:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: CSV exported successfully
 */
router.post('/:id/export-selected', authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), exportSelectedFormResponsesCSV);

/**
 * @swagger
 * /forms/{id}/import-csv:
 *   post:
 *     summary: Import responses from CSV (Admin only)
 *     tags: [Forms]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - responsesFile
 *             properties:
 *               responsesFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Responses imported successfully
 */
router.post('/:id/import-csv', upload.single('responsesFile'), authenticate, authorizeAdmin, validateParam('id', 'Form ID is required'), importResponsesFromCSV);

export default router;
