import { Document, Types } from 'mongoose';

/**
 * Request Interface matching EXACT production database schema
 * Collection: test.requests
 *
 * Relationships:
 * - retailer -> userdbs._id (M:1)
 * - farmer -> farmers._id (M:1)
 * - retailer_id -> retailers._id (M:1)
 * - retailer_farmer_id -> retailerfarmers._id (M:1)
 * - products -> retailerproducts._id (M:N)
 *
 * ⚠️ CRITICAL NOTES:
 * - products array can contain ObjectId, string, OR object
 * - farmerId can be string OR int (mixed type!)
 */

/**
 * Product item in a request
 */
export interface IProductItem {
  product?: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Payment schedule entry
 */
export interface IPaymentSchedule {
  paymentNumber: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  paidAt?: Date;
}

/**
 * Financing details
 */
export interface IFinancingDetails {
  tenor: number;                    // 3, 6, 9, or 12 months
  paymentFrequency: 'monthly' | 'quarterly';
  interestRate: number;
  productPrice: number;
  interest: number;
  totalAmount: number;
  numberOfPayments: number;
}

/**
 * Main Request interface
 */
export interface IRequest extends Document {
  _id: Types.ObjectId;

  // Required fields
  farmerName: string;
  products: (Types.ObjectId | string | IProductItem)[];  // ⚠️ Mixed types!
  status:
    | 'submitted'
    | 'admin_under_review'
    | 'admin_rejected'
    | 'approved'
    | 'offer_sent'
    | 'offer_accepted'
    | 'offer_rejected'
    | 'loan_created'
    | 'cancelled'
    // legacy states kept for compatibility during migration phase
    | 'pending'
    | 'rejected'
    | 'completed';
  updatedAt: Date;

  // Request type and parties
  requestType?: 'retailer_to_farmer' | 'farmer_to_retailer';
  retailer?: Types.ObjectId;        // ref to userdbs
  farmer?: Types.ObjectId;          // ref to farmers
  retailer_id?: Types.ObjectId;     // ref to retailers
  retailer_farmer_id?: Types.ObjectId; // ref to retailerfarmers

  // Farmer info (denormalized)
  farmerId?: string | number;       // ⚠️ Can be string OR int!
  farmerEmail?: string;
  farmerPhone?: string;

  // Retailer info (denormalized)
  retailerEmail?: string;

  // Financing
  financingDetails?: IFinancingDetails;
  paymentSchedule?: IPaymentSchedule[];
  paymentsMade?: (string | { amount: string })[];
  quantities?: { productId: string; productPrice: number; quantity: number }[];

  // Request details
  note?: string;
  retailerNote?: string;
  rejectionReason?: string;
  downPaymentAmount?: number;
  remainingAmount?: number;
  requestedTenorWeeks?: number;
  approvedTenorWeeks?: number;
  coveragePercent?: number;
  adminReviewedAt?: Date;
  adminRejectedAt?: Date;
  disbursedAt?: Date;
  offerSentAt?: Date;
  offerRespondedAt?: Date;
  farmerLetterImageUrl?: string;
  farmerResponse?: string;
  invoice?: string;
  offerLetterUrl?: string;
  loanId?: Types.ObjectId;
  disbursementTransactionId?: Types.ObjectId;
  paymentTerms?: string;
  totalAmount?: string;
  quantity?: string;

  // Location
  location?: string;
  locationName?: string;
  name?: string;

  // Contact
  phone?: string;
  phone_number?: string;
  productId?: Types.ObjectId;

  // Dates
  createdAt?: Date;
  approvedDate?: Date;
  paymentDueDate?: Date | null;
  maturityDate?: Date;
  respondedAt?: Date;
  completedAt?: Date;

  // Metadata
  __v?: number;
}

/**
 * Request creation input (retailer-to-farmer)
 */
export interface IRequestCreateInput {
  farmerId: string;
  farmerName?: string;
  farmerPhone?: string;
  products: IProductItem[];
  financingDetails?: IFinancingDetails;
  paymentSchedule?: Omit<IPaymentSchedule, 'paidAt'>[];
  downPaymentAmount?: number;
  requestedTenorWeeks?: number;
  farmerLetterImageUrl?: string;
  note?: string;
  offerLetterUrl?: string;
  offerLetterMimeType?: string;
  offerLetterFileName?: string;
  invoiceUrl?: string;
  invoiceMimeType?: string;
  invoiceFileName?: string;
}

/**
 * Request status update input
 */
export interface IRequestStatusUpdateInput {
  status:
    | 'submitted'
    | 'admin_under_review'
    | 'admin_rejected'
    | 'approved'
    | 'offer_sent'
    | 'offer_accepted'
    | 'offer_rejected'
    | 'loan_created'
    | 'cancelled'
    | 'pending'
    | 'rejected'
    | 'completed';
  rejectionReason?: string;
  farmerResponse?: string;
}

export interface IRequestAdminApproveInput {
  coveragePercent: number;
  approvedTenorWeeks: number;
  note?: string;
}

export interface IRequestAdminRejectInput {
  reason: string;
  note?: string;
}

export interface IRequestOfferResponseInput {
  decision: 'accept' | 'reject';
  reason?: string;
}

/**
 * Payment status update input
 */
export interface IPaymentUpdateInput {
  leg?: 'retailer_to_platform' | 'farmer_to_retailer';
  status?: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  paidAmount?: number;
  paidDate?: Date | string;
  comment?: string;
}

/**
 * Request response (safe to return to client)
 */
export interface IRequestResponse {
  _id: string;
  requestType?: string;
  retailer?: string;
  farmer?: string;
  farmerName: string;
  farmerEmail?: string;
  farmerPhone?: string;
  products: IProductItem[];
  financingDetails?: IFinancingDetails;
  paymentSchedule?: IPaymentSchedule[];
  status: string;
  note?: string;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt: Date;
}

/**
 * Request query filters
 */
export interface IRequestQueryFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated requests response
 */
export interface IPaginatedRequests {
  requests: IRequestResponse[];
  page: number;
  pages: number;
  total: number;
}

/**
 * Request with populated references
 */
export interface IRequestPopulated extends Omit<IRequest, 'retailer' | 'farmer'> {
  retailer?: {
    _id: Types.ObjectId;
    name?: string;
    businessName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  farmer?: {
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    farmLocationGPS?: string;
  };
}
