import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * User Routes
 * Base path: /api/users
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     description: Creates a new user account. Only admins can create users.
 *     tags: [Users]
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
 *               - passWord
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               passWord:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [admin, agent, retailer, superadmin]
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: User already exists
 */
router.post('/', authenticate, authorizeAdmin, createUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieves all users with pagination and filtering. Only admins can access this endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name (searches firstName and lastName)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt:desc
 *         description: Sort by field:order (e.g., createdAt:desc, email:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', authenticate, authorizeAdmin, getUsers);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a user by ID. Users can only view their own account unless they're admin.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only view own account
 *       404:
 *         description: User not found
 */
router.get('/:userId', authenticate, validateParam('userId', 'User ID is required'), getUser);

/**
 * @swagger
 * /users/{userId}:
 *   patch:
 *     summary: Update user
 *     description: Updates a user. Users can only update their own account unless they're admin. Only admins can change roles.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               passWord:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 description: Only admins can change role
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own account
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.patch('/:userId', authenticate, validateParam('userId', 'User ID is required'), updateUser);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: Deletes a user by setting is_active=false and is_deleted=true. Users can only delete themselves unless they're admin.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only delete own account
 *       404:
 *         description: User not found
 */
router.delete('/:userId', authenticate, validateParam('userId', 'User ID is required'), deleteUser);

export default router;
