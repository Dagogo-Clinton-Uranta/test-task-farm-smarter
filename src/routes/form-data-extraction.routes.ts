import { Router } from 'express';
import { triggerFarmerExtraction } from '../controllers/form-data-extraction.controller.js';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * Form Data Extraction Routes
 * Base path: /api/form-extraction
 */

/**
 * @swagger
 * /form-extraction/trigger:
 *   post:
 *     summary: Manually trigger farmer data extraction (Admin only)
 *     description: Processes all responses from farmer forms and creates/updates farmer records
 *     tags: [Form Data Extraction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Extraction completed successfully
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
 *                     processed:
 *                       type: number
 *                     created:
 *                       type: number
 *                     updated:
 *                       type: number
 *                     errors:
 *                       type: number
 */
router.post('/trigger', authenticate, authorizeAdmin, triggerFarmerExtraction);

export default router;
