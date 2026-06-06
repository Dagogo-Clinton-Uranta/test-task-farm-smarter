import { Router } from 'express';
import { getFarmerFormRequiredFields } from '../controllers/form-config.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * Form Config Routes
 * Base path: /api/form-config
 */

/**
 * @swagger
 * /form-config/farmer-required-fields:
 *   get:
 *     summary: Get farmer form required fields
 *     description: Returns the list of required field names for farmer forms. Configuration is stored at service level.
 *     tags: [Form Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Required fields retrieved successfully
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
 *                     requiredFields:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/farmer-required-fields', authenticate, getFarmerFormRequiredFields);

export default router;
