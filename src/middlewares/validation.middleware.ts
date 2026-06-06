import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/error.util.js';

/**
 * Validation middleware factory
 * Validates request body, params, or query against Joi schema
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      next(new ValidationError(errorMessage));
    } else {
      req[property] = value;
      next();
    }
  };
};

/**
 * Validation Schemas for Authentication
 */

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  passWord: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().required().messages({
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().required().messages({
    'any.required': 'Last name is required',
  }),
  phone: Joi.string().optional(),
  role: Joi.string()
    .valid('admin', 'agent', 'retailer', 'teller', 'merchant', 'farmer')
    .required()
    .messages({
      'any.required': 'Role is required',
      'any.only': 'Invalid role',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Validation Schemas for Retailer
 */

export const retailerRegisterSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  passWord: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().required().messages({
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().required().messages({
    'any.required': 'Last name is required',
  }),
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  businessName: Joi.string().optional(),
  businessAddress: Joi.string().optional(),
  companyName: Joi.string().optional(),
  companyEmail: Joi.string().email().optional(),
  storeName: Joi.string().optional(),
  state: Joi.string().optional(),
  localGovernment: Joi.string().optional(),
});

export const retailerPhoneRegisterSchema = Joi.object({
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
});

export const retailerCheckPhoneSchema = Joi.object({
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
});

export const verifySmsOtpSchema = Joi.object({
  phone: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required',
  }),
});

export const resendSmsOtpSchema = Joi.object({
  phone: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
});

export const retailerSetupPinSchema = Joi.object({
  pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'PIN must be exactly 6 digits',
    'any.required': 'PIN is required',
  }),
});

export const retailerPinLoginSchema = Joi.object({
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'PIN must be exactly 6 digits',
    'any.required': 'PIN is required',
  }),
});

export const retailerForgotPinSchema = Joi.object({
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
});

export const retailerVerifyPinResetOtpSchema = Joi.object({
  phone: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required',
  }),
});

export const retailerResetPinSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  pin: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'PIN must be exactly 6 digits',
    'any.required': 'PIN is required',
  }),
});

export const retailerProfileUpdateSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  middleName: Joi.string().optional(),
  gender: Joi.string().optional(),
  dateOfBirth: Joi.string().optional(),
  nationality: Joi.string().optional(),
  companyName: Joi.string().optional(),
  companyEmail: Joi.string().email().optional(),
  companyAddress: Joi.string().optional(),
  businessName: Joi.string().optional(),
  businessAddress: Joi.string().optional(),
  businessTown: Joi.string().optional(),
  businessNearestLandmark: Joi.string().optional(),
  businessGps: Joi.string().optional(),
  businessAddressMode: Joi.string().valid('manual', 'gps').optional(),
  businessAddressSameAsHome: Joi.boolean().optional(),
  storeName: Joi.string().optional(),
  cacRegistered: Joi.string().valid('yes', 'no').optional(),
  cacRegistrationNumber: Joi.string().optional(),
  businessChannel: Joi.string().valid('physical', 'online', 'both').optional(),
  phoneNumber: Joi.string().optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional(),
  state: Joi.string().optional(),
  localGovernment: Joi.string().optional(),
  nearestLandmark: Joi.string().optional(),
  stateOfOrigin: Joi.string().optional(),
  localGovernmentOfOrigin: Joi.string().optional(),
  currentState: Joi.string().optional(),
  currentLocalGovernment: Joi.string().optional(),
  gps: Joi.string().optional(),
  location: Joi.string().optional(),
  homeAddressMode: Joi.string().valid('manual', 'gps').optional(),
  shopSize: Joi.string().optional(),
  shopOwnership: Joi.string().optional(),
  yearsInBusiness: Joi.string().optional(),
  meansOfId: Joi.string().optional(),
  idNumber: Joi.string().optional(),
  nin: Joi.string().optional(),
  idDocument: Joi.string().allow(null).optional(),
  proofOfAddress: Joi.string().allow(null).optional(),
  utilityBill: Joi.string().allow(null).optional(),
  shopPhotos: Joi.string().allow(null).optional(),
  hasBvn: Joi.string().valid('yes', 'no').optional(),
  bvn: Joi.string().optional(),
  hasBusinessBankAccount: Joi.string().valid('yes', 'no').optional(),
  businessAccountType: Joi.string().valid('personal', 'business').optional(),
  accountNumber: Joi.string().optional(),
  bankName: Joi.string().optional(),
  meterNumber: Joi.string().optional(),
  utilityType: Joi.string().optional(),
  onboardingCurrentStep: Joi.number().integer().min(1).optional(),
  onboardingCompletedSteps: Joi.array().items(Joi.number().integer().min(1)).optional(),
  onboardingStatus: Joi.string().optional(),
  estimatedStockValue: Joi.string().optional(),
  estimatedRestockValue: Joi.string().optional(),
  restockingFrequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
  estimatedDailySalesRevenue: Joi.string().optional(),
  slowestDaySales: Joi.string().optional(),
  paymentModes: Joi.array().items(
    Joi.string().valid('cash', 'pos', 'mobile_app', 'transfer', 'ussd')
  ).optional(),
  monthlyNetProfit: Joi.string().optional(),
  hasPosTerminal: Joi.string().valid('yes', 'no').optional(),
  posProviderName: Joi.string().valid('OPay', 'Moniepoint', 'Fairmoney', 'Others').optional(),
  salesTrackingMethod: Joi.string().valid('Manual', 'Mobile App', 'POS System', 'Others').optional(),
  creditStartTimeline: Joi.string().valid('immediately', 'in_a_week', 'in_a_month').optional(),
  willingDailyRepayment: Joi.string().valid('yes', 'no').optional(),
  informationConfirmed: Joi.boolean().optional(),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be 6 digits',
    'any.required': 'OTP is required',
  }),
});

export const resendOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

/**
 * Validation Schemas for Retailer Products
 */

export const createProductSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Product name is required',
  }),
  // Accept price as number or string (will be converted to string in middleware)
  price: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .required()
    .messages({
      'any.required': 'Price is required',
      'alternatives.match': '"price" must be a number or string',
    }),
  // Accept quantity or stockQuantity (will be mapped in middleware)
  // After transformation, quantity will always be present as a string
  quantity: Joi.string().required().messages({
    'any.required': 'Quantity is required',
  }),
  stockQuantity: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .optional(),
  category: Joi.string().required().messages({
    'any.required': 'Category is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Description is required',
  }),
  unit: Joi.string().required().messages({
    'any.required': 'Unit is required',
  }),
  // Accept either image (singular) or images (array) - transformation middleware will map images[0] to image
  // After transformation, image will always be present if images was provided
  image: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).min(1).optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  isAvailableOnCredit: Joi.boolean().optional(),
})
  .or('quantity', 'stockQuantity')
  .messages({
    'object.missing': 'Quantity is required (use quantity or stockQuantity)',
  })
  .custom((value, helpers) => {
    // Ensure either image or images is provided
    if (!value.image && (!value.images || !Array.isArray(value.images) || value.images.length === 0)) {
      return helpers.error('any.custom', { message: 'Image is required (use image or images array)' });
    }
    return value;
  });

export const updateProductSchema = Joi.object({
  name: Joi.string().optional(),
  // Accept price as number or string (will be converted to string in middleware)
  price: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .optional(),
  // Accept quantity or stockQuantity (will be mapped in middleware)
  quantity: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .optional(),
  stockQuantity: Joi.alternatives()
    .try(Joi.number(), Joi.string())
    .optional(),
  category: Joi.string().optional(),
  description: Joi.string().optional(),
  unit: Joi.string().optional(),
  image: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  isAvailableOnCredit: Joi.boolean().optional(),
});

export const createOnboardingProductSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  quantity: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
});

/**
 * Validation Schemas for Requests
 */

const productItemSchema = Joi.object({
  product: Joi.string().optional(),
  name: Joi.string().required(),
  price: Joi.number().required(),
  quantity: Joi.number().required(),
});

const paymentScheduleItemSchema = Joi.object({
  paymentNumber: Joi.number().optional(),
  dueDate: Joi.date().required(),
  amount: Joi.number().required(),
  paidAmount: Joi.number().optional().default(0),
  status: Joi.string().valid('pending', 'paid', 'overdue', 'partially_paid').optional().default('pending'),
});

const financingDetailsSchema = Joi.object({
  tenor: Joi.number().valid(3, 6, 9, 12).required().messages({
    'any.only': 'Tenor must be 3, 6, 9, or 12 months',
  }),
  paymentFrequency: Joi.string().valid('monthly', 'quarterly').required(),
  interestRate: Joi.number().required(),
  productPrice: Joi.number().required(),
  interest: Joi.number().required(),
  totalAmount: Joi.number().required(),
  numberOfPayments: Joi.number().required(),
});

const requestStatusValues = [
  'submitted',
  'admin_under_review',
  'admin_rejected',
  'approved',
  'offer_sent',
  'offer_accepted',
  'offer_rejected',
  'loan_created',
  'cancelled',
  // legacy
  'pending',
  'rejected',
  'completed',
] as const;

export const createRequestSchema = Joi.object({
  farmerId: Joi.string().required().messages({
    'any.required': 'Farmer ID is required',
  }),
  farmerName: Joi.string().optional(),
  farmerPhone: Joi.string().optional(),
  products: Joi.array().items(productItemSchema).min(1).required().messages({
    'array.min': 'At least one product is required',
    'any.required': 'Products are required',
  }),
  financingDetails: financingDetailsSchema.optional(),
  paymentSchedule: Joi.array().items(paymentScheduleItemSchema).optional(),
  downPaymentAmount: Joi.number().min(0).optional().default(0),
  requestedTenorWeeks: Joi.number().integer().min(1).optional(),
  farmerLetterImageUrl: Joi.string().uri().optional(),
  note: Joi.string().optional(),
  offerLetterUrl: Joi.string().uri().optional(),
  offerLetterMimeType: Joi.string().optional(),
  offerLetterFileName: Joi.string().optional(),
  invoiceUrl: Joi.string().uri().optional(),
  invoiceMimeType: Joi.string().optional(),
  invoiceFileName: Joi.string().optional(),
});

export const updateRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...requestStatusValues)
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Invalid status',
    }),
  rejectionReason: Joi.string().optional(),
  farmerResponse: Joi.string().optional(),
});

export const adminReviewRequestSchema = Joi.object({});

export const adminApproveRequestSchema = Joi.object({
  coveragePercent: Joi.number().min(0).max(100).required().messages({
    'any.required': 'Coverage percent is required',
    'number.base': 'Coverage percent must be a number',
    'number.min': 'Coverage percent must be between 0 and 100',
    'number.max': 'Coverage percent must be between 0 and 100',
  }),
  approvedTenorWeeks: Joi.number().integer().min(1).required().messages({
    'any.required': 'Approved tenor in weeks is required',
    'number.base': 'Approved tenor in weeks must be a number',
    'number.min': 'Approved tenor in weeks must be at least 1',
  }),
  note: Joi.string().optional().allow(''),
});

export const adminRejectRequestSchema = Joi.object({
  reason: Joi.string().trim().required().messages({
    'any.required': 'Rejection reason is required',
    'string.empty': 'Rejection reason is required',
  }),
  note: Joi.string().optional().allow(''),
});

export const adminDisburseRequestSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'any.required': 'Disbursement amount is required',
    'number.base': 'Disbursement amount must be a number',
    'number.positive': 'Disbursement amount must be greater than zero',
  }),
  reference: Joi.string().trim().max(200).optional().allow(''),
  note: Joi.string().trim().max(5000).optional().allow(''),
});

export const requestOfferResponseSchema = Joi.object({
  decision: Joi.string().valid('accept', 'reject').required().messages({
    'any.required': 'Decision is required',
    'any.only': 'Decision must be either accept or reject',
  }),
  reason: Joi.string().optional().allow(''),
}).custom((value, helpers) => {
  if (value.decision === 'reject' && !String(value.reason || '').trim()) {
    return helpers.error('any.custom', { message: 'Reason is required when rejecting an offer' });
  }
  return value;
}, 'Offer response validation').messages({
  'any.custom': '{{#message}}',
});

export const requestNoteSchema = Joi.object({
  note: Joi.string().trim().min(1).max(5000).required().messages({
    'any.required': 'Note is required',
    'string.empty': 'Note is required',
    'string.max': 'Note must be less than or equal to 5000 characters',
  }),
});

export const requestAuditTrailQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).optional().default(100),
});

export const updatePaymentSchema = Joi.object({
  leg: Joi.string().valid('retailer_to_platform', 'farmer_to_retailer').optional(),
  status: Joi.string().valid('pending', 'paid', 'overdue', 'partially_paid').optional(),
  paidAmount: Joi.number().min(0).optional(),
  paidDate: Joi.date().iso().optional(),
  comment: Joi.string().trim().max(1000).optional().allow(''),
});

/**
 * Validation Schemas for Query Parameters
 */

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  category: Joi.string().optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  search: Joi.string().optional(),
});

export const requestQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid(...requestStatusValues).optional(),
  search: Joi.string().optional(),
});

export const loanQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('active', 'repaid', 'completed', 'defaulted', 'cancelled').optional(),
  search: Joi.string().optional(),
});

export const markInstallmentPaidSchema = Joi.object({
  paidDate: Joi.date().iso().required().messages({
    'any.required': 'Paid date is required',
    'date.format': 'Paid date must be a valid ISO date',
  }),
  reference: Joi.string().trim().min(1).max(200).required().messages({
    'any.required': 'Transaction reference is required',
    'string.empty': 'Transaction reference is required',
  }),
  note: Joi.string().trim().max(5000).optional().allow(''),
});

/**
 * Validation Schemas for Documents
 */

export const createDocumentSchema = Joi.object({
  documentType: Joi.string()
    .valid('RequestInvoice', 'OfferLetter')
    .required()
    .messages({
      'any.required': 'Document type is required',
      'any.only': 'Document type must be RequestInvoice or OfferLetter',
    }),
  request: Joi.string().optional(),
  farmer: Joi.string().optional(),
  fileUrl: Joi.string().uri().required().messages({
    'any.required': 'File URL is required',
    'string.uri': 'File URL must be a valid URL',
  }),
  fileName: Joi.string().required().messages({
    'any.required': 'File name is required',
  }),
  fileSize: Joi.number().optional(),
  mimeType: Joi.string().optional(),
  description: Joi.string().optional(),
  notes: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().optional().min(Joi.ref('validFrom')),
});

export const updateDocumentSchema = Joi.object({
  fileUrl: Joi.string().uri().optional(),
  fileName: Joi.string().optional(),
  fileSize: Joi.number().optional(),
  mimeType: Joi.string().optional(),
  description: Joi.string().optional(),
  notes: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().optional().min(Joi.ref('validFrom')),
  isActive: Joi.boolean().optional(),
});

export const approvalSchema = Joi.object({
  approvalStatus: Joi.string()
    .valid('approved', 'rejected', 'revision_requested')
    .required()
    .messages({
      'any.required': 'Approval status is required',
      'any.only': 'Approval status must be approved, rejected, or revision_requested',
    }),
  approvalNotes: Joi.string().optional(),
  rejectionReason: Joi.string().optional().when('approvalStatus', {
    is: 'rejected',
    then: Joi.required().messages({
      'any.required': 'Rejection reason is required when rejecting',
    }),
  }),
});

export const documentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  documentType: Joi.string().valid('RequestInvoice', 'OfferLetter').optional(),
  approvalStatus: Joi.string()
    .valid('pending', 'approved', 'rejected', 'revision_requested')
    .optional(),
  request: Joi.string().optional(),
  farmer: Joi.string().optional(),
  search: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
});
