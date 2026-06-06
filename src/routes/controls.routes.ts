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
import {  updateCreditCaps,updateInterestRates,updateCreditTiers } from '../controllers/controls.controller.js';

const router = Router();

/**
 * Controls Routes
 * Base path: /api/controls
 */


/**
 * @swagger
 * /controls/credittiers:
 *   put:
 *     summary: Update credit tiers (Super Admin only)
 *     tags: [Controls]
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
 *         description: Credit tiers updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: Controls not found
 */
router.put('/credittiers/:id',/*authenticate, authorize('superadmin'),*/ validateParam('id', 'Control ID is required'), updateCreditTiers);


/**
 * Controls Routes
 * Base path: /api/controls
 */


/**
 * @swagger
 * /controls/{id}:
 *   put:
 *     summary: Update credit caps (Super Admin only)
 *     tags: [Controls]
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
 *         description: Credit caps updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: Credit Caps not found
 */
router.put('/creditcaps/:id',/*authenticate, authorize('superadmin'),*/ validateParam('id', 'Control ID is required'), updateCreditCaps);



/**
 * Controls Routes
 * Base path: /api/controls
 */


/**
 * @swagger
 * /controls/interest:
 *   put:
 *     summary: Update interest rates (Super Admin only)
 *     tags: [Controls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBotdy:
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
 *         description: Interest rates updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin access required
 *       404:
 *         description: Credit Caps not found
 */
router.put('/interestrates/:id', /*authenticate, authorize('superadmin'),*/ validateParam('id', 'Control ID is required'), updateInterestRates);


export default router;
