import mongoose, { Schema, Model } from 'mongoose';
import { IRequest, IProductItem, IPaymentSchedule, IFinancingDetails } from '../interfaces/request.interface.js';

/**
 * Request Schema matching EXACT production database
 * Collection: test.requests
 *
 * Relationships:
 * - retailer -> userdbs._id (M:1)
 * - farmer -> farmers._id (M:1)
 * - retailer_id -> retailers._id (M:1)
 * - retailer_farmer_id -> retailerfarmers._id (M:1)
 *
 * ⚠️ CRITICAL NOTES:
 * - products array can contain ObjectId, string, OR object (Mixed type)
 * - farmerId can be string OR int (Mixed type)
 */

type RequestModel = Model<IRequest>;

// Sub-schema for product items
const productItemSchema = new Schema<IProductItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'RetailerProduct',
    },
    name: String,
    price: Number,
    quantity: Number,
  },
  { _id: false }
);

// Sub-schema for payment schedule
const paymentScheduleSchema = new Schema<IPaymentSchedule>(
  {
    paymentNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'partially_paid'],
      default: 'pending',
    },
    paidAt: Date,
  },
  { _id: false }
);

// Sub-schema for financing details
const financingDetailsSchema = new Schema<IFinancingDetails>(
  {
    tenor: {
      type: Number,
      required: true,
    },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly'],
      required: true,
    },
    interestRate: {
      type: Number,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    interest: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    numberOfPayments: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

// Main request schema
const requestSchema = new Schema<IRequest, RequestModel>(
  {
    // Required fields
    farmerName: {
      type: String,
      required: true,
    },
    products: {
      type: Schema.Types.Mixed, // ⚠️ Can be ObjectId[], string[], or object[]
      required: true,
    },
    status: {
      type: String,
      enum: [
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
      ],
      default: 'submitted',
      required: true,
    },

    // Request type and parties
    requestType: {
      type: String,
      enum: ['retailer_to_farmer', 'farmer_to_retailer'],
    },
    retailer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
    },
    retailer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Retailer',
    },
    retailer_farmer_id: {
      type: Schema.Types.ObjectId,
      ref: 'RetailerFarmer',
    },

    // Farmer info (denormalized)
    farmerId: {
      type: Schema.Types.Mixed, // ⚠️ Can be string OR int
    },
    farmerEmail: String,
    farmerPhone: String,

    // Retailer info
    retailerEmail: String,

    // Financing
    financingDetails: financingDetailsSchema,
    paymentSchedule: [paymentScheduleSchema],
    paymentsMade: {
      type: Schema.Types.Mixed, // Can be string[] or {amount: string}[]
      default: [],
    },
    quantities: [
      {
        productId: String,
        productPrice: Number,
        quantity: Number,
      },
    ],

    // Request details
    note: String,
    retailerNote: String,
    rejectionReason: String,
    downPaymentAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: Number,
    requestedTenorWeeks: Number,
    approvedTenorWeeks: Number,
    coveragePercent: Number,
    adminReviewedAt: Date,
    adminRejectedAt: Date,
    disbursedAt: Date,
    offerSentAt: Date,
    offerRespondedAt: Date,
    farmerLetterImageUrl: String,
    farmerResponse: String,
    invoice: String,
    offerLetterUrl: String,
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
    },
    disbursementTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    paymentTerms: String,
    totalAmount: String,
    quantity: String,

    // Location
    location: String,
    locationName: String,
    name: String,

    // Contact
    phone: String,
    phone_number: String,
    productId: {
      type: Schema.Types.ObjectId,
    },

    // Dates
    approvedDate: Date,
    paymentDueDate: {
      type: Schema.Types.Mixed, // Date | null
    },
    maturityDate: Date,
    respondedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'requests', // Exact collection name from production
    strict: false, // Allow flexible schema for production compatibility
  }
);

// Indexes for performance
requestSchema.index({ retailer: 1, status: 1 });
requestSchema.index({ farmer: 1, status: 1 });
requestSchema.index({ retailer_id: 1 });
requestSchema.index({ requestType: 1, status: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ farmerName: 'text' }); // Text search on farmer name

// Create and export model
export const Request = mongoose.model<IRequest, RequestModel>('Request', requestSchema);
