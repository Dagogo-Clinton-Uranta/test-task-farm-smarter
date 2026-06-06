import { Router } from 'express';
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  getDocumentByNumber,
  getDocumentsByRequestId,
  updateDocument,
  approveDocument,
  deleteDocument,
  getDocumentStats,
} from '../controllers/document.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validate, createDocumentSchema, updateDocumentSchema, approvalSchema } from '../middlewares/validation.middleware.js';

const router = Router();

/**
 * Document Routes
 * Base path: /api/documents
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get all documents with filters
 *     description: Retrieves paginated documents with optional filters
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [RequestInvoice, OfferLetter]
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, revision_requested]
 *       - in: query
 *         name: request
 *         schema:
 *           type: string
 *         description: Filter by request ID
 *       - in: query
 *         name: farmer
 *         schema:
 *           type: string
 *         description: Filter by farmer ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in document number, description, notes
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
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getAllDocuments);

/**
 * @swagger
 * /documents/stats:
 *     summary: Get document statistics
 *     description: Returns statistics about documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: retailerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, getDocumentStats);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
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
 *         description: Document details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.get('/:id', authenticate, getDocumentById);

/**
 * @swagger
 * /documents/number/{documentNumber}:
 *   get:
 *     summary: Get document by document number
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentNumber
 *         required: true
 *         schema:
 *           type: string
 *         example: INV-2024-0001
 *     responses:
 *       200:
 *         description: Document details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.get('/number/:documentNumber', authenticate, getDocumentByNumber);

/**
 * @swagger
 * /documents/request/{requestId}:
 *   get:
 *     summary: Get documents by request ID
 *     description: Returns all documents associated with a request
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents for the request
 *       401:
 *         description: Unauthorized
 */
router.get('/request/:requestId', authenticate, getDocumentsByRequestId);

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Create a new document
 *     description: Creates a new document (invoice or offer letter)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - fileUrl
 *               - fileName
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [RequestInvoice, OfferLetter]
 *               request:
 *                 type: string
 *               farmer:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               mimeType:
 *                 type: string
 *               totalAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *               tenor:
 *                 type: number
 *               interestRate:
 *                 type: number
 *               paymentFrequency:
 *                 type: string
 *                 enum: [monthly, quarterly]
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validate(createDocumentSchema), createDocument);

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Update document
 *     tags: [Documents]
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
 *             properties:
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *               totalAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *               tenor:
 *                 type: number
 *               interestRate:
 *                 type: number
 *               paymentFrequency:
 *                 type: string
 *                 enum: [monthly, quarterly]
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.put('/:id', authenticate, validate(updateDocumentSchema), updateDocument);

/**
 * @swagger
 * /documents/{id}/approval:
 *   put:
 *     summary: Approve or reject document
 *     description: Updates the approval status of a document
 *     tags: [Documents]
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
 *               - approvalStatus
 *             properties:
 *               approvalStatus:
 *                 type: string
 *                 enum: [approved, rejected, revision_requested]
 *               approvalNotes:
 *                 type: string
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document approval status updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.put('/:id/approval', authenticate, validate(approvalSchema), approveDocument);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete document (soft delete)
 *     tags: [Documents]
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
 *         description: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.delete('/:id', authenticate, deleteDocument);

export default router;
