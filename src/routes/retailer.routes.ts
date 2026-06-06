import { Router } from 'express';
import {
  registerRetailer,
  verifyOtp,
  resendOtp,
  phoneRegisterRetailer,
  checkRetailerPhone,
  getRetailerBanks,
  loginRetailerWithPin,
  forgotRetailerPin,
  verifyRetailerPinResetOtp,
  resetRetailerPin,
  verifySmsOtp,
  resendSmsOtp,
  setupRetailerPin,
  getRetailerProfile,
  updateRetailerProfile,
  getAllRetailers,
  getRetailerByIdAdmin,
  getRetailerProductsAdmin,
  getRetailerRequestsAdmin,
} from '../controllers/retailer.controller.js';
import {
  createProduct,
  getProducts,
  getProductOverview,
  getProductById,
  updateProduct,
  deleteProduct,
  transformProductData,
} from '../controllers/retailer-product.controller.js';
import { authenticate, authorizeRetailer, authorizeAdmin } from '../middlewares/auth.middleware.js';
import { validateParam } from '../middlewares/validate.middleware.js';
import {
  validate,
  retailerRegisterSchema,
  retailerPhoneRegisterSchema,
  retailerCheckPhoneSchema,
  retailerPinLoginSchema,
  retailerForgotPinSchema,
  retailerVerifyPinResetOtpSchema,
  retailerResetPinSchema,
  verifySmsOtpSchema,
  resendSmsOtpSchema,
  retailerSetupPinSchema,
  retailerProfileUpdateSchema,
  verifyOtpSchema,
  resendOtpSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  paginationQuerySchema,
} from '../middlewares/validation.middleware.js';

const router = Router();

/**
 * Retailer Routes
 * Base path: /api/retailers
 */

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

/**
 * @swagger
 * /retailers/register:
 *   post:
 *     summary: Register a new retailer
 *     description: Creates a new retailer account with user credentials and sends OTP for verification
 *     tags: [Retailers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - passWord
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "retailer@example.com"
 *               passWord:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+2348012345678"
 *               businessName:
 *                 type: string
 *                 example: "Doe Agro Supplies"
 *               businessAddress:
 *                 type: string
 *                 example: "123 Market Street, Lagos"
 *               storeName:
 *                 type: string
 *                 example: "Doe Farm Store"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               localGovernment:
 *                 type: string
 *                 example: "Ikeja"
 *     responses:
 *       201:
 *         description: Registration successful
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
 *                     user:
 *                       type: object
 *                     retailer:
 *                       type: object
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     requiresVerification:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or phone already registered
 */
router.post('/register', validate(retailerRegisterSchema), registerRetailer);

// Phone-based registration (no email/password required)
router.post('/phone-register', validate(retailerPhoneRegisterSchema), phoneRegisterRetailer);
router.post('/check-phone', validate(retailerCheckPhoneSchema), checkRetailerPhone);
router.get('/banks', getRetailerBanks);
router.post('/pin-login', validate(retailerPinLoginSchema), loginRetailerWithPin);
router.post('/forgot-pin', validate(retailerForgotPinSchema), forgotRetailerPin);
router.post('/verify-pin-reset-otp', validate(retailerVerifyPinResetOtpSchema), verifyRetailerPinResetOtp);
router.post('/reset-pin', validate(retailerResetPinSchema), resetRetailerPin);
router.post('/verify-sms-otp', validate(verifySmsOtpSchema), verifySmsOtp);
router.post('/resend-sms-otp', validate(resendSmsOtpSchema), resendSmsOtp);

/**
 * @swagger
 * /retailers/verify-otp:
 *   post:
 *     summary: Verify OTP for retailer registration
 *     description: Verifies the OTP sent during registration and activates the account
 *     tags: [Retailers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "retailer@example.com"
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                     verified:
 *                       type: boolean
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

/**
 * @swagger
 * /retailers/resend-otp:
 *   post:
 *     summary: Resend OTP for retailer verification
 *     description: Resends OTP email for account verification. Rate limited to prevent abuse.
 *     tags: [Retailers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "retailer@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Rate limit exceeded or user not found
 */
router.post('/resend-otp', validate(resendOtpSchema), resendOtp);

// ==========================================
// PROTECTED ROUTES (Auth Required)
// ==========================================

router.post(
  '/setup-pin',
  authenticate,
  authorizeRetailer,
  validate(retailerSetupPinSchema),
  setupRetailerPin
);

/**
 * @swagger
 * /retailers/profile:
 *   get:
 *     summary: Get current retailer's profile
 *     description: Retrieves the profile of the currently authenticated retailer including user and business information
 *     tags: [Retailers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.get('/profile', authenticate, authorizeRetailer, getRetailerProfile);

/**
 * @swagger
 * /retailers/profile:
 *   put:
 *     summary: Update current retailer's profile
 *     description: Updates the profile of the currently authenticated retailer
 *     tags: [Retailers]
 *     security:
 *       - bearerAuth: []
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
 *               middleName:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessAddress:
 *                 type: string
 *               storeName:
 *                 type: string
 *               state:
 *                 type: string
 *               localGovernment:
 *                 type: string
 *               shopSize:
 *                 type: string
 *               shopOwnership:
 *                 type: string
 *               yearsInBusiness:
 *                 type: string
 *               meansOfId:
 *                 type: string
 *               nin:
 *                 type: string
 *               idDocument:
 *                 type: string
 *               proofOfAddress:
 *                 type: string
 *               shopPhotos:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, authorizeRetailer, validate(retailerProfileUpdateSchema), updateRetailerProfile);

/**
 * @swagger
 * /retailers:
 *   get:
 *     summary: Get all retailers (Admin only)
 *     description: Retrieves a paginated list of all retailers. Requires admin privileges.
 *     tags: [Retailers]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or business name
 *     responses:
 *       200:
 *         description: Retailers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, authorizeAdmin, validate(paginationQuerySchema, 'query'), getAllRetailers);
router.get('/admin/:id', authenticate, authorizeAdmin, validateParam('id', 'Retailer ID is required'), getRetailerByIdAdmin);
router.get('/admin/:id/products', authenticate, authorizeAdmin, validateParam('id', 'Retailer ID is required'), validate(productQuerySchema, 'query'), getRetailerProductsAdmin);
router.get('/admin/:id/requests', authenticate, authorizeAdmin, validateParam('id', 'Retailer ID is required'), getRetailerRequestsAdmin);

// ==========================================
// PRODUCT ROUTES (Retailer Products)
// ==========================================

/**
 * @swagger
 * /retailers/products:
 *   get:
 *     summary: Get retailer's products
 *     description: Retrieves products for the currently authenticated retailer with filtering and pagination
 *     tags: [Retailer Products]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, draft, archived]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/products', authenticate, authorizeRetailer, validate(productQuerySchema, 'query'), getProducts);

/**
 * @swagger
 * /retailers/products/overview:
 *   get:
 *     summary: Get product overview/statistics
 *     description: Retrieves product statistics and overview for the currently authenticated retailer
 *     tags: [Retailer Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview retrieved successfully
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
 *                     totalProducts:
 *                       type: integer
 *                     activeProducts:
 *                       type: integer
 *                     draftProducts:
 *                       type: integer
 *                     archivedProducts:
 *                       type: integer
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/products/overview', authenticate, authorizeRetailer, getProductOverview);

/**
 * @swagger
 * /retailers/products:
 *   post:
 *     summary: Create a new product
 *     description: Creates a new product for the currently authenticated retailer
 *     tags: [Retailer Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - quantity
 *               - category
 *               - description
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *                 example: "NPK Fertilizer"
 *               price:
 *                 type: string
 *                 example: "5000"
 *               quantity:
 *                 type: string
 *                 example: "100"
 *               category:
 *                 type: string
 *                 example: "Fertilizers"
 *               description:
 *                 type: string
 *                 example: "High-quality NPK fertilizer for all crops"
 *               unit:
 *                 type: string
 *                 example: "kg"
 *               image:
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, draft, archived]
 *                 default: active
 *               isAvailableOnCredit:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/products', authenticate, authorizeRetailer, transformProductData, validate(createProductSchema), createProduct);

/**
 * @swagger
 * /retailers/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieves a specific product by ID for the currently authenticated retailer
 *     tags: [Retailer Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.get('/products/:id', authenticate, authorizeRetailer, validateParam('id', 'Product ID is required'), getProductById);

/**
 * @swagger
 * /retailers/products/{id}:
 *   put:
 *     summary: Update a product
 *     description: Updates a specific product for the currently authenticated retailer
 *     tags: [Retailer Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: string
 *               quantity:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               unit:
 *                 type: string
 *               image:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, draft, archived]
 *               isAvailableOnCredit:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.put('/products/:id', authenticate, authorizeRetailer, validateParam('id', 'Product ID is required'), transformProductData, validate(updateProductSchema), updateProduct);

/**
 * @swagger
 * /retailers/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Soft deletes a product (sets status to archived) for the currently authenticated retailer
 *     tags: [Retailer Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.delete('/products/:id', authenticate, authorizeRetailer, validateParam('id', 'Product ID is required'), deleteProduct);

export default router;
