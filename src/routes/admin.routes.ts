import { Router } from 'express';
import {
  createAdmin,
  editAdmin,
  createSuperAdmin,
  getAdmins,
  getAdmin,
  getAdminForms,
} from '../controllers/admin.controller.js';
import { authenticate, authorizeAdmin, authorize } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Admin Routes
 * Base path: /api/admins
 */

/**
 * @swagger
 * /admins:
 *   post:
 *     summary: Create a new admin (Super Admin only)
 *     tags: [Admins]
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
 *         description: Admin created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/', authenticate, authorize('superadmin'), createAdmin);

/**
 * @swagger
 * /admins/super:
 *   post:
 *     summary: Create a Super Admin (Super Admin only)
 *     tags: [Admins]
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
 *         description: Super Admin created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/super', authenticate, authorize('superadmin'), createSuperAdmin);

/**
 * @swagger
 * /admins/create-super-admin:
 *   post:
 *     summary: Create a Super Admin - Alias route (Super Admin only)
 *     tags: [Admins]
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
 *               isSuperAdmin:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Super Admin created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.post('/create-super-admin', authenticate, authorize('superadmin'), createSuperAdmin);

/**
 * @swagger
 * /admins:
 *   get:
 *     summary: Get all admins (Super Admin only)
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 */
router.get('/', authenticate, authorize('superadmin'), getAdmins);

/**
 * @swagger
 * /admins/{id}:
 *   get:
 *     summary: Get admin by ID (Admin only)
 *     tags: [Admins]
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
 *         description: Admin details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Admin not found
 */
router.get('/:id', authenticate, authorizeAdmin, validateParam('id', 'Admin ID is required'), getAdmin);

/**
 * @swagger
 * /admins/{id}:
 *   put:
 *     summary: Update admin (Super Admin only)
 *     tags: [Admins]
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
 *     responses:
 *       204:
 *         description: Admin updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: Admin not found
 */
router.put('/:id', authenticate, authorize('superadmin'), validateParam('id', 'Admin ID is required'), editAdmin);

/**
 * @swagger
 * /admins/forms:
 *   get:
 *     summary: Get forms created by current admin
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Forms created by admin
 *       401:
 *         description: Unauthorized
 */
router.get('/forms', authenticate, getAdminForms);

export default router;
