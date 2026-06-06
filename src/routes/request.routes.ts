import { Router } from 'express';
import {
  createRetailerToFarmerRequest,
  getRetailerRequests,
  getFarmerRequests,
  getRequestDetails,
  updateRequestStatus,
  updatePaymentStatus,
  getRetailerRequestStats,
  getAllRequestsAdmin,
  adminReviewRequest,
  adminApproveRequest,
  adminRejectRequest,
  adminDisburseRequest,
  addAdminRequestNote,
  getAdminRequestNotes,
  getAdminRequestAuditTrail,
  retailerOfferResponse,
  viewGeneratedInvoice,
  viewGeneratedOfferLetter,
} from '../controllers/request.controller.js';
import { authenticate, authorizeRetailer, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';
import {
  validate,
  createRequestSchema,
  adminReviewRequestSchema,
  adminApproveRequestSchema,
  adminRejectRequestSchema,
  adminDisburseRequestSchema,
  requestOfferResponseSchema,
  requestNoteSchema,
  requestAuditTrailQuerySchema,
  updateRequestStatusSchema,
  updatePaymentSchema,
  requestQuerySchema,
} from '../middlewares/validation.middleware.js';

const router = Router();

/**
 * Request Routes
 * Base path: /api/requests
 * Handles retailer-to-farmer financing requests
 */

/**
 * @swagger
 * /requests/retailer-to-farmer:
 *   post:
 *     summary: Create a retailer-to-farmer request
 *     description: Creates a new financing request from a retailer to a farmer. Includes product details, financing terms, and payment schedule.
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - farmerId
 *               - products
 *               - financingDetails
 *               - paymentSchedule
 *             properties:
 *               farmerId:
 *                 type: string
 *                 description: The ID of the farmer receiving the request
 *                 example: "507f1f77bcf86cd799439011"
 *               farmerName:
 *                 type: string
 *                 example: "John Farmer"
 *               farmerPhone:
 *                 type: string
 *                 example: "+2348012345678"
 *               products:
 *                 type: array
 *                 description: List of products being requested
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                     - quantity
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: Product ID reference
 *                     name:
 *                       type: string
 *                       example: "NPK Fertilizer"
 *                     price:
 *                       type: number
 *                       example: 5000
 *                     quantity:
 *                       type: number
 *                       example: 10
 *               financingDetails:
 *                 type: object
 *                 description: Financing terms for the request
 *                 required:
 *                   - tenor
 *                   - paymentFrequency
 *                   - interestRate
 *                   - productPrice
 *                   - interest
 *                   - totalAmount
 *                   - numberOfPayments
 *                 properties:
 *                   tenor:
 *                     type: integer
 *                     enum: [3, 6, 9, 12]
 *                     description: Loan duration in months
 *                     example: 6
 *                   paymentFrequency:
 *                     type: string
 *                     enum: [monthly, quarterly]
 *                     example: "monthly"
 *                   interestRate:
 *                     type: number
 *                     description: Interest rate percentage
 *                     example: 10
 *                   productPrice:
 *                     type: number
 *                     description: Total product price
 *                     example: 50000
 *                   interest:
 *                     type: number
 *                     description: Total interest amount
 *                     example: 5000
 *                   totalAmount:
 *                     type: number
 *                     description: Total amount to repay
 *                     example: 55000
 *                   numberOfPayments:
 *                     type: integer
 *                     description: Number of payment installments
 *                     example: 6
 *               paymentSchedule:
 *                 type: array
 *                 description: Payment schedule breakdown
 *                 items:
 *                   type: object
 *                   required:
 *                     - dueDate
 *                     - amount
 *                   properties:
 *                     paymentNumber:
 *                       type: integer
 *                       example: 1
 *                     dueDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-02-15"
 *                     amount:
 *                       type: number
 *                       example: 9166
 *                     paidAmount:
 *                       type: number
 *                       default: 0
 *                     status:
 *                       type: string
 *                       enum: [pending, paid, overdue, partially_paid]
 *                       default: pending
 *               note:
 *                 type: string
 *                 description: Additional notes for the request
 *                 example: "Please deliver to farm location"
 *     responses:
 *       201:
 *         description: Request created successfully
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
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/retailer-to-farmer',
  authenticate,
  authorizeRetailer,
  validate(createRequestSchema),
  createRetailerToFarmerRequest
);

/**
 * @swagger
 * /requests/retailer:
 *   get:
 *     summary: Get all requests for the logged-in retailer
 *     description: Retrieves all requests created by the currently authenticated retailer with pagination and filtering
 *     tags: [Requests]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed, cancelled]
 *         description: Filter by request status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by farmer name
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
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
 *                     requests:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/retailer', authenticate, authorizeRetailer, validate(requestQuerySchema, 'query'), getRetailerRequests);

/**
 * @swagger
 * /requests/retailer/stats:
 *   get:
 *     summary: Get request statistics for the logged-in retailer
 *     description: Retrieves statistics about requests for the currently authenticated retailer
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     totalRequests:
 *                       type: integer
 *                     pendingRequests:
 *                       type: integer
 *                     approvedRequests:
 *                       type: integer
 *                     rejectedRequests:
 *                       type: integer
 *                     completedRequests:
 *                       type: integer
 *                     totalValue:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/retailer/stats', authenticate, authorizeRetailer, getRetailerRequestStats);
router.get('/admin', authenticate, authorizeAdmin, validate(requestQuerySchema, 'query'), getAllRequestsAdmin);
router.post(
  '/:id/review',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(adminReviewRequestSchema),
  adminReviewRequest
);
router.post(
  '/:id/approve',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(adminApproveRequestSchema),
  adminApproveRequest
);
router.post(
  '/:id/reject',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(adminRejectRequestSchema),
  adminRejectRequest
);
router.post(
  '/:id/disburse',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(adminDisburseRequestSchema),
  adminDisburseRequest
);

/**
 * @swagger
 * /requests/farmer/{farmerId}:
 *   get:
 *     summary: Get all requests for a specific farmer
 *     description: Retrieves all requests associated with a specific farmer by their ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Farmer ID
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
 *       400:
 *         description: Invalid farmer ID
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/farmer/:farmerId',
  authenticate,
  validateParam('farmerId', 'Farmer ID is required'),
  getFarmerRequests
);

/**
 * @swagger
 * /requests/{id}/details:
 *   get:
 *     summary: Get request details by ID
 *     description: Retrieves detailed information about a specific request including all products, financing details, and payment schedule
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Request details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Request not found
 */
router.get('/:id/details', authenticate, validateParam('id', 'Request ID is required'), getRequestDetails);
router.post(
  '/:id/notes',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(requestNoteSchema),
  addAdminRequestNote
);
router.get(
  '/:id/notes',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  getAdminRequestNotes
);
router.get(
  '/:id/audit-trail',
  authenticate,
  authorizeAdmin,
  validateParam('id', 'Request ID is required'),
  validate(requestAuditTrailQuerySchema, 'query'),
  getAdminRequestAuditTrail
);
router.get('/:id/invoice', authenticate, validateParam('id', 'Request ID is required'), viewGeneratedInvoice);
router.get('/:id/offer-letter', authenticate, validateParam('id', 'Request ID is required'), viewGeneratedOfferLetter);
router.post(
  '/:id/offer-response',
  authenticate,
  authorizeRetailer,
  validateParam('id', 'Request ID is required'),
  validate(requestOfferResponseSchema),
  retailerOfferResponse
);

/**
 * @swagger
 * /requests/{id}/status:
 *   put:
 *     summary: Update request status
 *     description: Updates the status of a request (approve, reject, complete, cancel)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, completed, cancelled]
 *                 example: "approved"
 *               rejectionReason:
 *                 type: string
 *                 description: Required when status is 'rejected'
 *                 example: "Credit limit exceeded"
 *               farmerResponse:
 *                 type: string
 *                 description: Farmer's response or acknowledgment
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Request not found
 */
router.put(
  '/:id/status',
  authenticate,
  validateParam('id', 'Request ID is required'),
  validate(updateRequestStatusSchema),
  updateRequestStatus
);

/**
 * @swagger
 * /requests/{id}/payment/{paymentNumber}:
 *   put:
 *     summary: Update payment status in payment schedule
 *     description: Updates the status of a specific payment in the request's payment schedule
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *       - in: path
 *         name: paymentNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Payment number in the schedule (1-indexed)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, paid, overdue, partially_paid]
 *                 example: "paid"
 *               paidAmount:
 *                 type: number
 *                 description: Amount paid for this installment
 *                 example: 9166
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid payment number or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Request or payment not found
 */
router.put(
  '/:id/payment/:paymentNumber',
  authenticate,
  validateParam('id', 'Request ID is required'),
  validate(updatePaymentSchema),
  updatePaymentStatus
);

export default router;
