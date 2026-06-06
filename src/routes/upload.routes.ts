import { Router } from 'express';
import multer from 'multer';
import {
  uploadSingle,
  uploadMultiple,
  uploadFarmerPhoto,
  uploadShopPhotos,
  uploadProofOfAddress,
  uploadIdDocument,
  uploadUtilityBill,
} from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Configure multer for memory storage (we upload to S3)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10, // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`));
    }
  },
});

/**
 * Upload Routes
 * Base path: /api/upload
 * Handles file uploads to S3 storage
 */

/**
 * @swagger
 * /upload/{folder}:
 *   post:
 *     summary: Upload a single file
 *     description: Uploads a single file to the specified folder in S3 storage
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folder
 *         required: true
 *         schema:
 *           type: string
 *           enum: [general, farmer-photos, shop-photos, proof-of-address, id-documents, utility-bills, product-images]
 *         description: Target folder for the upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
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
 *                     fileUrl:
 *                       type: string
 *                       description: Public URL of the uploaded file
 *                     fileName:
 *                       type: string
 *                       description: Generated filename in S3
 *       400:
 *         description: No file provided or invalid file type
 *       401:
 *         description: Unauthorized
 */
router.post('/:folder', authenticate, upload.single('file'), uploadSingle);

/**
 * @swagger
 * /upload/{folder}/multiple:
 *   post:
 *     summary: Upload multiple files
 *     description: Uploads multiple files to the specified folder in S3 storage (max 10 files)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folder
 *         required: true
 *         schema:
 *           type: string
 *           enum: [general, farmer-photos, shop-photos, proof-of-address, id-documents, utility-bills, product-images]
 *         description: Target folder for the uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The files to upload (max 10)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
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
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fileUrl:
 *                             type: string
 *                           fileName:
 *                             type: string
 *                     totalUploaded:
 *                       type: integer
 *                     totalFailed:
 *                       type: integer
 *       400:
 *         description: No files provided or invalid file types
 *       401:
 *         description: Unauthorized
 */
router.post('/:folder/multiple', authenticate, upload.array('files', 10), uploadMultiple);

/**
 * @swagger
 * /upload/farmer-photo:
 *   post:
 *     summary: Upload a farmer photo
 *     description: Uploads a farmer photo. Shortcut endpoint that uses the farmer-photos folder.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Farmer photo uploaded successfully
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/farmer-photo', authenticate, upload.single('file'), uploadFarmerPhoto);

/**
 * @swagger
 * /upload/shop-photos:
 *   post:
 *     summary: Upload shop photos
 *     description: Uploads shop photos for retailer profile. Accepts multiple files.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Shop photos uploaded successfully
 *       400:
 *         description: No files provided
 *       401:
 *         description: Unauthorized
 */
router.post('/shop-photos', authenticate, upload.array('files', 10), uploadShopPhotos);

/**
 * @swagger
 * /upload/proof-of-address:
 *   post:
 *     summary: Upload proof of address document
 *     description: Uploads a proof of address document for KYC verification
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Proof of address uploaded successfully
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/proof-of-address', authenticate, upload.single('file'), uploadProofOfAddress);

/**
 * @swagger
 * /upload/id-documents:
 *   post:
 *     summary: Upload ID document
 *     description: Uploads an ID document (passport, national ID, driver's license) for KYC verification
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: ID document uploaded successfully
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/id-documents', authenticate, upload.single('file'), uploadIdDocument);

/**
 * @swagger
 * /upload/utility-bills:
 *   post:
 *     summary: Upload utility bill
 *     description: Uploads a utility bill document for address verification
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Utility bill uploaded successfully
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/utility-bills', authenticate, upload.single('file'), uploadUtilityBill);

export default router;
