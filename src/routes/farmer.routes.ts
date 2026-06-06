import { Router } from 'express';
import {
  getAllFarmers,
  getPaginatedFarmers,
  getFarmer,
  getFarmersByAgent,
  getFarmersByRetailer,
  getFarmersForCurrentRetailer,
  createFarmerByRetailer,
  updateFarmerById,
  deleteFarmerById,
} from '../controllers/farmer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Farmer Routes
 * Base path: /api/farmers
 */

/**
 * @swagger
 * /farmers/all:
 *   get:
 *     summary: Get all farmers (legacy endpoint)
 *     description: Retrieves all farmers. Matches old backend endpoint. Optionally include populated details (agent, retailer, response) by adding ?details=true query parameter.
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: details
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include populated details (agent, retailer, response)
 *     responses:
 *       200:
 *         description: List of farmers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/all', authenticate, getAllFarmers);

/**
 * @swagger
 * /farmers:
 *   get:
 *     summary: Get all farmers
 *     description: Retrieves all farmers. Optionally include populated details (agent, retailer, response) by adding ?details=true query parameter.
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: details
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include populated details (agent, retailer, response)
 *     responses:
 *       200:
 *         description: List of farmers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getAllFarmers);

/**
 * @swagger
 * /farmers/retailer:
 *   get:
 *     summary: Get farmers for current logged-in retailer (mobile app endpoint)
 *     description: Retrieves paginated farmers created by the currently authenticated retailer. This endpoint matches the mobile app's expected path.
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (mobile app uses pageNumber)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (alternative to pageNumber)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by farmer name
 *     responses:
 *       200:
 *         description: Farmers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     farmers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/retailer', authenticate, getFarmersForCurrentRetailer);

/**
 * @swagger
 * /farmers/my-farmers:
 *   get:
 *     summary: Get farmers for current logged-in retailer
 *     description: Retrieves paginated farmers created by the currently authenticated retailer
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by farmer name
 *     responses:
 *       200:
 *         description: Farmers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     farmers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/my-farmers', authenticate, getFarmersForCurrentRetailer);

/**
 * @swagger
 * /farmers/paginated:
 *   get:
 *     summary: Get farmers with pagination
 *     description: Retrieves paginated farmers with optional keyword search
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Farmers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/paginated', authenticate, getPaginatedFarmers);

/**
 * @swagger
 * /farmers/{id}:
 *   get:
 *     summary: Get farmer by ID
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: details
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include populated details
 *     responses:
 *       200:
 *         description: Farmer details
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Farmer not found
 */
router.get('/:id', authenticate, validateParam('id', 'Farmer ID is required'), getFarmer);

/**
 * @swagger
 * /farmers/agent/{agentUserId}:
 *   get:
 *     summary: Get farmers by agent user ID
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of farmers for the agent
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get('/agent/:agentUserId', authenticate, validateParam('agentUserId', 'Agent user ID is required'), getFarmersByAgent);

/**
 * @swagger
 * /farmers/retailer/{retailerId}:
 *   get:
 *     summary: Get farmers by retailer ID
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: retailerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of farmers for the retailer
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get('/retailer/:retailerId', authenticate, validateParam('retailerId', 'Retailer ID is required'), getFarmersByRetailer);

/**
 * @swagger
 * /farmers/my-farmers:
 *   get:
 *     summary: Get farmers for current logged-in retailer
 *     description: Retrieves paginated farmers created by the currently authenticated retailer
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by farmer name
 *     responses:
 *       200:
 *         description: Farmers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     farmers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/my-farmers', authenticate, getFarmersForCurrentRetailer);

/**
 * @swagger
 * /farmers:
 *   post:
 *     summary: Create a new farmer
 *     description: Creates a new farmer record by the authenticated retailer
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phone
 *               - gender
 *               - age
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               otherNames:
 *                 type: string
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               email:
 *                 type: string
 *                 format: email
 *               gender:
 *                 type: string
 *                 example: "male"
 *               age:
 *                 type: string
 *                 example: "35"
 *               farmingType:
 *                 type: string
 *                 example: "crop"
 *               cropsLivestock:
 *                 type: string
 *                 example: "Maize, Rice"
 *               farmSize:
 *                 type: string
 *                 example: "5"
 *               farmSizeUnit:
 *                 type: string
 *                 example: "hectares"
 *               farmLocationGPS:
 *                 type: string
 *                 example: "6.5244,3.3792"
 *               photo:
 *                 type: string
 *                 description: URL to farmer photo
 *     responses:
 *       201:
 *         description: Farmer created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, createFarmerByRetailer);

/**
 * @swagger
 * /farmers/{id}:
 *   put:
 *     summary: Update farmer by ID
 *     description: Updates an existing farmer record. Retailer can only update their own farmers.
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Farmer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               gender:
 *                 type: string
 *               age:
 *                 type: string
 *               farmingType:
 *                 type: string
 *               cropsLivestock:
 *                 type: string
 *               farmSize:
 *                 type: string
 *               farmSizeUnit:
 *                 type: string
 *               farmLocationGPS:
 *                 type: string
 *               photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Farmer updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot update other retailers' farmers
 *       404:
 *         description: Farmer not found
 */
router.put('/:id', authenticate, validateParam('id', 'Farmer ID is required'), updateFarmerById);

/**
 * @swagger
 * /farmers/{id}:
 *   delete:
 *     summary: Delete farmer by ID
 *     description: Deletes a farmer record. Retailer can only delete their own farmers.
 *     tags: [Farmers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Farmer ID
 *     responses:
 *       200:
 *         description: Farmer deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot delete other retailers' farmers
 *       404:
 *         description: Farmer not found
 */
router.delete('/:id', authenticate, validateParam('id', 'Farmer ID is required'), deleteFarmerById);

export default router;
