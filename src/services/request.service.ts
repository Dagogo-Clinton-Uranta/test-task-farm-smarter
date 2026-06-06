import mongoose from 'mongoose';
import { Request } from '../models/request.model.js';
import { Document } from '../models/document.model.js';
import { Farmer } from '../models/farmer.model.js';
import { Retailer } from '../models/retailer.model.js';
import { RequestNote } from '../models/request-note.model.js';
import { RequestAuditTrail } from '../models/request-audit-trail.model.js';
import {
  IRequest,
  IRequestCreateInput,
  IRequestAdminApproveInput,
  IRequestAdminRejectInput,
  IRequestOfferResponseInput,
  IRequestStatusUpdateInput,
  IPaymentUpdateInput,
  IRequestQueryFilters,
  IPaginatedRequests,
  IRequestPopulated,
} from '../interfaces/request.interface.js';
import { IRequestDisburseInput } from '../interfaces/loan.interface.js';
import {
  IRequestAuditTrail,
  RequestAuditAction,
  RequestAuditActorType,
} from '../interfaces/request-audit-trail.interface.js';
import { IRequestNote } from '../interfaces/request-note.interface.js';
import { logger } from '../utils/logger.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/error.util.js';
import { env } from '../config/env.js';
import { sendEmail } from './email.service.js';
import { generateAndUploadRequestInvoicePdf } from './request-invoice.service.js';
import { generateAndUploadRequestOfferLetterPdf } from './request-offer-letter.service.js';
import { Loan } from '../models/loan.model.js';
import { LoanInstallment } from '../models/loan-installment.model.js';
import { Transaction } from '../models/transaction.model.js';

/**
 * Request Service
 * Handles all retailer-to-farmer request business logic
 */

const toObjectId = (value: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

const logRequestAudit = async (params: {
  requestId: string | mongoose.Types.ObjectId;
  actorType: RequestAuditActorType;
  actorUserId?: string | mongoose.Types.ObjectId;
  action: RequestAuditAction;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, unknown>;
}): Promise<IRequestAuditTrail> => {
  const audit = await RequestAuditTrail.create({
    requestId: toObjectId(params.requestId),
    actorType: params.actorType,
    actorUserId: params.actorUserId ? toObjectId(params.actorUserId) : undefined,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    metadata: params.metadata,
  });

  return audit;
};

/**
 * Create a new retailer-to-farmer request
 * Also creates associated document records for offer letter and invoice
 */
export const createRequest = async (
  retailerUserId: string,
  retailerName: string,
  input: IRequestCreateInput
): Promise<IRequest> => {
  const retailer = await Retailer.findOne({
    retailer_user_id: new mongoose.Types.ObjectId(retailerUserId),
  })
    .select('_id')
    .lean();

  if (!retailer?._id) {
    throw new BadRequestError('Retailer profile not found');
  }

  const farmer = await Farmer.findById(input.farmerId)
    .select('_id retailer_id addedByType addedById')
    .lean();

  if (!farmer?._id) {
    throw new BadRequestError('Farmer not found');
  }

  const farmerRetailerId = farmer.retailer_id?.toString();
  const retailerDocId = retailer._id.toString();
  const isRetailerOwner =
    farmerRetailerId === retailerDocId ||
    (String(farmer.addedByType || '').toLowerCase() === 'retailer' &&
      String(farmer.addedById || '') === retailerUserId);

  if (!isRetailerOwner) {
    throw new ForbiddenError('You can only create requests for farmers you onboarded');
  }

  const downPaymentAmount = Math.max(0, Number(input.downPaymentAmount || 0));
  const productTotal = (input.products || []).reduce((sum, item) => {
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
    return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
  }, 0);
  const financingTotal = Number(input.financingDetails?.totalAmount || 0);
  const totalAmount = financingTotal > 0 ? financingTotal : productTotal;
  const remainingAmount = Math.max(0, totalAmount - downPaymentAmount);
  const requestedTenorWeeks =
    Number(input.requestedTenorWeeks) > 0
      ? Number(input.requestedTenorWeeks)
      : Number(input.financingDetails?.tenor || 0) > 0
        ? Number(input.financingDetails?.tenor || 0) * 4
        : Math.max(1, Number(input.paymentSchedule?.length || 1));

  const request = new Request({
    requestType: 'retailer_to_farmer',
    retailer: new mongoose.Types.ObjectId(retailerUserId),
    retailer_id: new mongoose.Types.ObjectId(retailerDocId),
    farmer: new mongoose.Types.ObjectId(input.farmerId),
    farmerName: input.farmerName || '',
    farmerPhone: input.farmerPhone,
    farmerId: input.farmerId,
    products: input.products,
    financingDetails: input.financingDetails,
    paymentSchedule: (input.paymentSchedule || []).map((p, index) => ({
      ...p,
      paymentNumber: index + 1,
      paidAmount: 0,
      status: 'pending',
    })),
    note: input.note || '',
    retailerNote: input.note || '',
    downPaymentAmount,
    remainingAmount,
    requestedTenorWeeks,
    farmerLetterImageUrl: input.farmerLetterImageUrl,
    status: 'submitted',
    // Document URLs
    offerLetterUrl: input.offerLetterUrl,
    invoice: input.invoiceUrl,
  });

  const savedRequest = await request.save();
  await logRequestAudit({
    requestId: savedRequest._id,
    actorType: 'retailer',
    actorUserId: retailerUserId,
    action: 'request_submitted',
    toStatus: 'submitted',
    metadata: {
      requestedTenorWeeks,
      downPaymentAmount,
      remainingAmount,
      totalProducts: input.products?.length || 0,
    },
  });

  const fallbackInvoiceUrl = `${env.BASE_URL || 'http://localhost:8000'}/api/requests/${savedRequest._id.toString()}/invoice`;
  let generatedInvoiceUrl = fallbackInvoiceUrl;
  let generatedInvoiceFileName = `invoice-${savedRequest._id.toString()}.pdf`;

  try {
    const uploadedInvoice = await generateAndUploadRequestInvoicePdf({
      requestId: savedRequest._id.toString(),
      requestDate: savedRequest.createdAt || new Date(),
      farmerName: input.farmerName || '',
      retailerName: retailerName || 'Retailer',
      products: (input.products || []).map((item) => ({
        name: item.name || 'Product',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      })),
      downPaymentAmount,
      totalAmount,
      remainingAmount,
      requestedTenorWeeks,
    });
    generatedInvoiceUrl = uploadedInvoice.fileUrl;
    generatedInvoiceFileName = uploadedInvoice.fileName;
  } catch (error: any) {
    logger.error('Failed to generate/upload invoice PDF, using fallback URL', {
      requestId: savedRequest._id.toString(),
      error: error?.message || String(error),
    });
  }

  // Helper function to detect mime type from URL or file extension
  const detectMimeType = (url: string, providedMimeType?: string): string => {
    if (providedMimeType) return providedMimeType;
    
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  };

  // Helper function to extract file name from URL
  const extractFileName = (url: string, providedFileName?: string): string => {
    if (providedFileName) return providedFileName;
    
    const segments = url.split('/');
    const fileName = segments[segments.length - 1] || '';
    return decodeURIComponent(fileName) || 'document';
  };

  // Create document records for uploaded files
  const documentPromises: Promise<any>[] = [];

  // Create OfferLetter document if URL provided
  if (input.offerLetterUrl) {
    const offerLetterDoc = new Document({
      documentType: 'OfferLetter',
      request: savedRequest._id,
      retailer: new mongoose.Types.ObjectId(retailerUserId),
      farmer: new mongoose.Types.ObjectId(input.farmerId),
      createdBy: new mongoose.Types.ObjectId(retailerUserId),
      fileUrl: input.offerLetterUrl,
      fileName: extractFileName(input.offerLetterUrl, input.offerLetterFileName),
      mimeType: detectMimeType(input.offerLetterUrl, input.offerLetterMimeType),
      description: 'Offer letter for farmer request',
      approvalStatus: 'pending',
    });
    documentPromises.push(offerLetterDoc.save());
  }

  // Create RequestInvoice document (auto-generated at submission)
  {
    const invoiceDoc = new Document({
      documentType: 'RequestInvoice',
      request: savedRequest._id,
      retailer: new mongoose.Types.ObjectId(retailerUserId),
      farmer: new mongoose.Types.ObjectId(input.farmerId),
      createdBy: new mongoose.Types.ObjectId(retailerUserId),
      fileUrl: generatedInvoiceUrl,
      fileName: input.invoiceFileName || generatedInvoiceFileName,
      mimeType: input.invoiceMimeType || 'application/pdf',
      description: 'Invoice for farmer request',
      approvalStatus: 'pending',
    });
    documentPromises.push(invoiceDoc.save());
  }

  // Wait for all document creations
  if (documentPromises.length > 0) {
    const createdDocs = await Promise.all(documentPromises);
    const invoiceDoc = createdDocs.find((doc: any) => doc?.documentType === 'RequestInvoice');
    if (invoiceDoc?._id) {
      await Request.findByIdAndUpdate(savedRequest._id, {
        $set: {
          invoice: generatedInvoiceUrl,
          invoiceDocumentId: invoiceDoc._id,
        },
      }).exec();
    }
    await logRequestAudit({
      requestId: savedRequest._id,
      actorType: 'system',
      action: 'invoice_generated',
      metadata: {
        invoiceUrl: generatedInvoiceUrl,
      },
    });
    logger.info('Documents created for request', {
      requestId: savedRequest._id.toString(),
      offerLetterCreated: !!input.offerLetterUrl,
      invoiceCreated: true,
    });
  }

  logger.info('Request created', {
    requestId: savedRequest._id.toString(),
    retailerUserId,
    farmerId: input.farmerId,
  });

  return (await Request.findById(savedRequest._id).exec()) || savedRequest;
};

/**
 * Get requests for a retailer with pagination and filtering
 */
export const getRequestsByRetailerId = async (
  retailerUserId: string,
  filters: IRequestQueryFilters = {}
): Promise<IPaginatedRequests> => {
  const { status, search, page = 1, limit = 10 } = filters;

  // Build query
  const query: any = {
    requestType: 'retailer_to_farmer',
    retailer: new mongoose.Types.ObjectId(retailerUserId),
  };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.farmerName = { $regex: search, $options: 'i' };
  }

  // Get total count
  const total = await Request.countDocuments(query);

  // Get requests with pagination and population
  const requests = await Request.find(query)
    .populate('farmer', 'firstName lastName email phone farmLocationGPS')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    requests: requests as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

/**
 * Get requests for a farmer with pagination and filtering
 */
export const getRequestsByFarmerId = async (
  farmerId: string,
  filters: IRequestQueryFilters = {}
): Promise<IPaginatedRequests> => {
  const { status, page = 1, limit = 10 } = filters;

  // Build query
  const query: any = {
    requestType: 'retailer_to_farmer',
    farmer: new mongoose.Types.ObjectId(farmerId),
  };

  if (status) {
    query.status = status;
  }

  // Get total count
  const total = await Request.countDocuments(query);

  // Get requests with pagination and population
  const requests = await Request.find(query)
    .populate('retailer', 'firstName lastName businessName email phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    requests: requests as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

/**
 * Get request by ID with full details
 */
export const getRequestById = async (requestId: string): Promise<IRequestPopulated | null> => {
  return await Request.findById(requestId)
    .populate('retailer', 'firstName lastName businessName email phone address')
    .populate('farmer', 'firstName lastName email phone farmLocationGPS creditScore creditScoreCategory')
    .exec() as any;
};

const assertRequestStatus = (
  request: IRequest | IRequestPopulated,
  allowedStatuses: string[],
  message: string
) => {
  if (!allowedStatuses.includes(String(request.status))) {
    throw new BadRequestError(message);
  }
};

export const moveRequestToAdminReview = async (
  requestId: string,
  adminUserId?: string
): Promise<IRequest> => {
  const request = await Request.findById(requestId).exec();
  if (!request) {
    throw new NotFoundError('Request not found');
  }

  assertRequestStatus(
    request,
    ['submitted'],
    'Only submitted requests can be moved to admin review'
  );

  const fromStatus = String(request.status);
  request.status = 'admin_under_review';
  request.adminReviewedAt = new Date();

  await request.save();
  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'moved_to_under_review',
    fromStatus,
    toStatus: request.status,
  });
  return request;
};

export const rejectRequestByAdmin = async (
  requestId: string,
  input: IRequestAdminRejectInput,
  adminUserId?: string
): Promise<IRequest> => {
  const request = await Request.findById(requestId)
    .populate('retailer', 'firstName lastName email')
    .exec();

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  assertRequestStatus(
    request,
    ['submitted', 'admin_under_review'],
    'Only submitted or under-review requests can be rejected'
  );

  const fromStatus = String(request.status);
  request.status = 'admin_rejected';
  request.rejectionReason = input.reason;
  request.adminRejectedAt = new Date();

  if (input.note?.trim()) {
    request.note = input.note.trim();
  }

  await request.save();
  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'request_rejected_by_admin',
    fromStatus,
    toStatus: request.status,
    metadata: {
      reason: input.reason,
      hasNote: Boolean(input.note?.trim()),
    },
  });

  const retailer: any = (request as any).retailer;
  if (retailer?.email) {
    const retailerName = [retailer.firstName, retailer.lastName].filter(Boolean).join(' ') || 'Retailer';
    await sendEmail(
      retailer.email,
      retailerName,
      'Request Rejected',
      `<p>Your request for farmer <strong>${request.farmerName || 'N/A'}</strong> was rejected.</p>
       <p><strong>Reason:</strong> ${input.reason}</p>`
    );
  }

  return request;
};

export const approveRequestByAdmin = async (
  requestId: string,
  input: IRequestAdminApproveInput,
  adminUserId?: string
): Promise<IRequest> => {
  const request = await Request.findById(requestId)
    .populate('retailer', 'firstName lastName email')
    .exec();

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  assertRequestStatus(
    request,
    ['admin_under_review'],
    'Only requests under admin review can be approved'
  );

  const fromStatus = String(request.status);
  request.coveragePercent = input.coveragePercent;
  request.approvedTenorWeeks = input.approvedTenorWeeks;
  request.approvedDate = new Date();
  request.offerSentAt = new Date();
  if (input.note?.trim()) {
    request.note = input.note.trim();
  }

  const fallbackOfferLetterUrl = `${env.BASE_URL || 'http://localhost:8000'}/api/requests/${request._id.toString()}/offer-letter`;
  let offerLetterUrl = fallbackOfferLetterUrl;
  let offerLetterFileName = `offer-letter-${request._id.toString()}.pdf`;
  const downPaymentAmount = Number(request.downPaymentAmount || 0) || 0;
  const remainingAmount =
    Number(request.remainingAmount || 0) || 0;
  const totalAmount =
    Number(request.financingDetails?.totalAmount || request.totalAmount || 0) ||
    Number(remainingAmount + downPaymentAmount) ||
    0;
  const retailerName =
    [((request as any).retailer?.firstName || ''), ((request as any).retailer?.lastName || '')]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Retailer';

  try {
    const uploadedOfferLetter = await generateAndUploadRequestOfferLetterPdf({
      requestId: request._id.toString(),
      requestDate: new Date(),
      farmerName: request.farmerName || '',
      retailerName,
      coveragePercent: input.coveragePercent,
      approvedTenorWeeks: input.approvedTenorWeeks,
      downPaymentAmount,
      totalAmount,
      remainingAmount,
    });
    offerLetterUrl = uploadedOfferLetter.fileUrl;
    offerLetterFileName = uploadedOfferLetter.fileName;
  } catch (error: any) {
    logger.error('Failed to generate/upload offer letter PDF, using fallback URL', {
      requestId: request._id.toString(),
      error: error?.message || String(error),
    });
  }

  request.offerLetterUrl = offerLetterUrl;
  request.status = 'offer_sent';

  await request.save();
  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'request_approved_by_admin',
    fromStatus,
    toStatus: request.status,
    metadata: {
      coveragePercent: input.coveragePercent,
      approvedTenorWeeks: input.approvedTenorWeeks,
      hasNote: Boolean(input.note?.trim()),
    },
  });
  await logRequestAudit({
    requestId: request._id,
    actorType: 'system',
    action: 'offer_letter_generated',
    metadata: { offerLetterUrl },
  });
  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'offer_sent',
    toStatus: request.status,
    metadata: {
      offerLetterUrl,
      coveragePercent: input.coveragePercent,
      approvedTenorWeeks: input.approvedTenorWeeks,
    },
  });

  // Upsert offer letter document reference for traceability
  await Document.findOneAndUpdate(
    { request: request._id, documentType: 'OfferLetter' },
    {
      $set: {
        fileUrl: offerLetterUrl,
        fileName: offerLetterFileName,
        mimeType: 'application/pdf',
        description: 'Offer letter generated by admin approval',
        approvalStatus: 'approved',
        retailer: request.retailer,
        farmer: request.farmer,
      },
      $setOnInsert: {
        documentType: 'OfferLetter',
        request: request._id,
        createdBy: request.retailer,
      },
    },
    { upsert: true, new: true }
  ).exec();

  const retailer: any = (request as any).retailer;
  if (retailer?.email) {
    const retailerEmailName = [retailer.firstName, retailer.lastName].filter(Boolean).join(' ') || 'Retailer';
    await sendEmail(
      retailer.email,
      retailerEmailName,
      'Request Approved - Offer Sent',
      `<p>Your request for farmer <strong>${request.farmerName || 'N/A'}</strong> has been approved.</p>
       <p><strong>Coverage Percent:</strong> ${input.coveragePercent}%</p>
       <p><strong>Approved Tenor:</strong> ${input.approvedTenorWeeks} weeks</p>
       <p><a href="${offerLetterUrl}">View Offer Letter</a></p>`
    );
  }

  return request;
};

export const respondToOfferByRetailer = async (
  requestId: string,
  retailerUserId: string,
  input: IRequestOfferResponseInput
): Promise<IRequest> => {
  const request = await Request.findById(requestId).exec();

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  if (String(request.retailer || '') !== retailerUserId) {
    throw new ForbiddenError('You are not allowed to respond to this request offer');
  }

  assertRequestStatus(
    request,
    ['offer_sent'],
    'Only requests with an active offer can be responded to'
  );

  const fromStatus = String(request.status);
  if (input.decision === 'accept') {
    request.status = 'offer_accepted';
    request.rejectionReason = undefined;
  } else {
    request.status = 'offer_rejected';
    request.rejectionReason = input.reason?.trim() || 'Offer rejected by retailer';
  }
  request.offerRespondedAt = new Date();

  await request.save();
  await logRequestAudit({
    requestId: request._id,
    actorType: 'retailer',
    actorUserId: retailerUserId,
    action:
      input.decision === 'accept'
        ? 'offer_accepted_by_retailer'
        : 'offer_rejected_by_retailer',
    fromStatus,
    toStatus: request.status,
    metadata:
      input.decision === 'reject'
        ? { reason: request.rejectionReason }
        : undefined,
  });

  return request;
};

/**
 * Update request status
 */
export const updateRequestStatus = async (
  requestId: string,
  updateData: IRequestStatusUpdateInput,
  actor?: { actorType: RequestAuditActorType; actorUserId?: string }
): Promise<IRequest | null> => {
  const request = await Request.findById(requestId);

  if (!request) {
    return null;
  }

  const fromStatus = String(request.status);
  // Update status
  request.status = updateData.status;

  // Handle rejection
  if (
    (updateData.status === 'rejected' || updateData.status === 'admin_rejected' || updateData.status === 'offer_rejected') &&
    updateData.rejectionReason
  ) {
    request.rejectionReason = updateData.rejectionReason;
  }

  // Handle farmer response
  if (updateData.farmerResponse) {
    request.farmerResponse = updateData.farmerResponse;
    request.respondedAt = new Date();
  }

  // Handle approval
  if (updateData.status === 'approved') {
    request.approvedDate = new Date();
  }

  // Handle completion
  if (updateData.status === 'completed') {
    request.completedAt = new Date();
  }

  const savedRequest = await request.save();

  logger.info('Request status updated', {
    requestId,
    newStatus: updateData.status,
  });

  await logRequestAudit({
    requestId: savedRequest._id,
    actorType: actor?.actorType || 'system',
    actorUserId: actor?.actorUserId,
    action: 'request_status_updated',
    fromStatus,
    toStatus: updateData.status,
    metadata: {
      rejectionReason: updateData.rejectionReason,
      farmerResponse: updateData.farmerResponse,
    },
  });

  return savedRequest;
};

/**
 * Update payment in payment schedule
 */
export const updatePaymentStatus = async (
  requestId: string,
  paymentNumber: number,
  updateData: IPaymentUpdateInput
): Promise<IRequest | null> => {
  const request = await Request.findById(requestId);

  if (!request) {
    return null;
  }

  if (updateData.leg) {
    const legInstallments = await LoanInstallment.find({
      requestId: request._id,
      leg: updateData.leg,
    })
      .sort({ installmentNumber: 1 })
      .lean();

    const firstUnpaid = legInstallments.find((entry) => entry.status !== 'paid');
    const targetInstallmentSnapshot = legInstallments.find(
      (entry) => entry.installmentNumber === paymentNumber
    );
    const isMarkingPayment =
      String(updateData.status || '').toLowerCase() === 'paid' ||
      (updateData.paidAmount !== undefined && Number(updateData.paidAmount) > 0);

    if (
      isMarkingPayment &&
      firstUnpaid &&
      targetInstallmentSnapshot &&
      targetInstallmentSnapshot.status !== 'paid' &&
      paymentNumber !== firstUnpaid.installmentNumber
    ) {
      throw new BadRequestError(
        `Installments must be paid sequentially. Please pay installment ${firstUnpaid.installmentNumber} first.`
      );
    }

    const installment = await LoanInstallment.findOne({
      requestId: request._id,
      leg: updateData.leg,
      installmentNumber: paymentNumber,
    });

    if (!installment) {
      return null;
    }

    if (updateData.status) {
      installment.status = updateData.status;
    }

    if (updateData.paidAmount !== undefined) {
      installment.paidAmount = updateData.paidAmount;
    }

    if (String(updateData.status || '').toLowerCase() === 'paid') {
      installment.paidAmount =
        updateData.paidAmount !== undefined ? updateData.paidAmount : installment.amount;
    }

    if (updateData.paidDate) {
      const parsedPaidDate = new Date(updateData.paidDate);
      if (!Number.isNaN(parsedPaidDate.getTime())) {
        installment.paidAt = parsedPaidDate;
      }
    } else if (String(installment.status || '').toLowerCase() === 'paid') {
      installment.paidAt = new Date();
    }

    if (updateData.comment !== undefined) {
      installment.metadata = {
        ...(installment.metadata || {}),
        comment: String(updateData.comment || '').trim(),
      };
    }

    if (installment.paidAmount >= installment.amount) {
      installment.status = 'paid';
    } else if (installment.paidAmount > 0) {
      installment.status = 'partially_paid';
    } else if (installment.status !== 'overdue') {
      installment.status = 'pending';
    }

    if (installment.status === 'pending' && new Date() > installment.dueDate) {
      installment.status = 'overdue';
    }

    await installment.save();

    await logRequestAudit({
      requestId: request._id,
      actorType: 'retailer',
      action: 'request_status_updated',
      metadata: {
        paymentNumber,
        leg: updateData.leg,
        installmentStatus: installment.status,
        paidAmount: installment.paidAmount,
        paidAt: installment.paidAt,
        comment: updateData.comment,
      },
    });

    logger.info('Loan installment payment status updated', {
      requestId,
      paymentNumber,
      leg: updateData.leg,
      newStatus: installment.status,
      paidAmount: installment.paidAmount,
    });

    return request;
  }

  if (!request.paymentSchedule) {
    return null;
  }

  // Find the payment in schedule
  const paymentIndex = request.paymentSchedule.findIndex(
    (p) => p.paymentNumber === paymentNumber
  );

  if (paymentIndex === -1) {
    return null;
  }

  const payment = request.paymentSchedule[paymentIndex];

  if (!payment) {
    return null;
  }

  // Update payment status
  if (updateData.status) {
    payment.status = updateData.status;
  }

  // Update paid amount and auto-determine status
  if (updateData.paidAmount !== undefined) {
    payment.paidAmount = updateData.paidAmount;

    if (updateData.paidAmount >= payment.amount) {
      payment.status = 'paid';
      payment.paidAt = new Date();
    } else if (updateData.paidAmount > 0) {
      payment.status = 'partially_paid';
    }
  }

  // Check if payment is overdue
  if (payment.status === 'pending' && new Date() > payment.dueDate) {
    payment.status = 'overdue';
  }

  request.paymentSchedule[paymentIndex] = payment;

  const savedRequest = await request.save();

  logger.info('Payment status updated', {
    requestId,
    paymentNumber,
    newStatus: payment.status,
    paidAmount: payment.paidAmount,
  });

  return savedRequest;
};

/**
 * Verify request belongs to retailer
 */
export const verifyRequestOwnership = async (
  requestId: string,
  retailerUserId: string
): Promise<boolean> => {
  const request = await Request.findOne({
    _id: requestId,
    retailer: new mongoose.Types.ObjectId(retailerUserId),
  }).exec();

  return !!request;
};

/**
 * Get request statistics for a retailer
 */
export const getRequestStats = async (retailerUserId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}> => {
  const pipeline = [
    {
      $match: {
        requestType: 'retailer_to_farmer',
        retailer: new mongoose.Types.ObjectId(retailerUserId),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ];

  const results = await Request.aggregate(pipeline);

  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
  };

  results.forEach((item: { _id: string; count: number }) => {
    const status = item._id as keyof typeof stats;
    if (status in stats) {
      stats[status] = item.count;
    }
    stats.total += item.count;
  });

  return stats;
};

export const getRequestsForRetailerAdmin = async (
  retailerUserId: string,
  retailerId: string,
  filters: IRequestQueryFilters & { direction?: 'raised' | 'received' | 'all' } = {}
): Promise<IPaginatedRequests> => {
  const { status, search, page = 1, limit = 10, direction = 'all' } = filters;

  const retailerObjectId = new mongoose.Types.ObjectId(retailerUserId);
  const retailerDocObjectId = new mongoose.Types.ObjectId(retailerId);

  const query: any = {
    $or: [{ retailer: retailerObjectId }, { retailer_id: retailerDocObjectId }],
  };

  if (direction === 'raised') {
    query.requestType = 'retailer_to_farmer';
  } else if (direction === 'received') {
    query.requestType = 'farmer_to_retailer';
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.farmerName = { $regex: search, $options: 'i' };
  }

  const total = await Request.countDocuments(query);

  const requests = await Request.find(query)
    .populate('retailer', 'firstName lastName businessName email phone')
    .populate('farmer', 'firstName lastName email phone farmLocationGPS')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    requests: requests as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

export const getAllRequestsForAdmin = async (
  filters: IRequestQueryFilters = {}
): Promise<IPaginatedRequests> => {
  const { status, search, page = 1, limit = 10 } = filters;

  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { farmerName: { $regex: search, $options: 'i' } },
      { farmerPhone: { $regex: search, $options: 'i' } },
      { farmerEmail: { $regex: search, $options: 'i' } },
      { retailerEmail: { $regex: search, $options: 'i' } },
      { note: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Request.countDocuments(query);

  const requests = await Request.find(query)
    .populate('retailer', 'firstName lastName email')
    .populate('farmer', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    requests: requests as any,
    page,
    pages: Math.ceil(total / limit),
    total,
  };
};

const distributeWeeklyInstallments = (amount: number, weeks: number): number[] => {
  const safeWeeks = Math.max(1, Math.floor(weeks));
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / safeWeeks);
  const remainder = totalCents - baseCents * safeWeeks;

  return Array.from({ length: safeWeeks }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);
    return cents / 100;
  });
};

export const disburseRequestByAdmin = async (
  requestId: string,
  adminUserId: string,
  input: IRequestDisburseInput
): Promise<IRequest> => {
  const request = await Request.findById(requestId).exec();
  if (!request) {
    throw new NotFoundError('Request not found');
  }

  assertRequestStatus(
    request,
    ['offer_accepted'],
    'Only offer-accepted requests can be disbursed'
  );

  const existingLoan = await Loan.findOne({ requestId: request._id }).select('_id').lean();
  if (existingLoan?._id) {
    throw new BadRequestError('Loan already exists for this request');
  }

  const downPaymentAmount = Number(request.downPaymentAmount || 0) || 0;
  const remainingAmount = Number(request.remainingAmount || 0) || 0;
  const totalAmount =
    Number(request.financingDetails?.totalAmount || request.totalAmount || 0) ||
    remainingAmount + downPaymentAmount;
  const approvedTenorWeeks = Math.max(
    1,
    Number(request.approvedTenorWeeks || request.requestedTenorWeeks || 1)
  );
  const disbursementAmount = Number(input.amount || 0);

  if (!Number.isFinite(disbursementAmount) || disbursementAmount <= 0) {
    throw new BadRequestError('Disbursement amount must be greater than zero');
  }
  if (remainingAmount > 0 && disbursementAmount > remainingAmount) {
    throw new BadRequestError('Disbursement amount cannot exceed remaining amount');
  }

  const fromStatus = String(request.status);
  const disbursedAt = new Date();
  if (!request.retailer || !request.farmer) {
    throw new BadRequestError('Request is missing retailer or farmer linkage');
  }

  const loan = await Loan.create({
    requestId: request._id,
    retailerUserId: toObjectId(request.retailer as any),
    retailerId: request.retailer_id,
    farmerId: toObjectId(request.farmer as any),
    principalAmount: remainingAmount || Math.max(totalAmount - downPaymentAmount, 0),
    disbursedAmount: disbursementAmount,
    approvedTenorWeeks,
    coveragePercent: request.coveragePercent,
    disbursedAt,
    disbursementReference: input.reference?.trim(),
    disbursementNote: input.note?.trim(),
    createdBy: toObjectId(adminUserId),
    status: 'active',
  });

  const disbursementTransaction = await Transaction.create({
    loanId: loan._id,
    requestId: request._id,
    type: 'disbursement',
    leg: 'platform_to_retailer',
    amount: disbursementAmount,
    reference: input.reference?.trim(),
    note: input.note?.trim(),
    status: 'posted',
    createdBy: toObjectId(adminUserId),
  });

  const retailerToPlatformAmounts = distributeWeeklyInstallments(disbursementAmount, approvedTenorWeeks);
  const farmerToRetailerAmounts = distributeWeeklyInstallments(
    remainingAmount || disbursementAmount,
    approvedTenorWeeks
  );

  const installmentDocs: Array<any> = [];
  for (let i = 0; i < approvedTenorWeeks; i += 1) {
    const dueDate = new Date(disbursedAt);
    dueDate.setDate(dueDate.getDate() + (i + 1) * 7);

    installmentDocs.push({
      loanId: loan._id,
      requestId: request._id,
      leg: 'retailer_to_platform',
      installmentNumber: i + 1,
      dueDate,
      amount: retailerToPlatformAmounts[i],
      paidAmount: 0,
      status: 'pending',
      metadata: { source: 'phase5_auto_schedule' },
    });
    installmentDocs.push({
      loanId: loan._id,
      requestId: request._id,
      leg: 'farmer_to_retailer',
      installmentNumber: i + 1,
      dueDate,
      amount: farmerToRetailerAmounts[i],
      paidAmount: 0,
      status: 'pending',
      metadata: { source: 'phase5_auto_schedule' },
    });
  }
  await LoanInstallment.insertMany(installmentDocs);

  request.status = 'loan_created';
  request.loanId = loan._id as any;
  request.disbursementTransactionId = disbursementTransaction._id as any;
  request.disbursedAt = disbursedAt;
  await request.save();

  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'request_disbursed',
    fromStatus,
    toStatus: request.status,
    metadata: {
      amount: disbursementAmount,
      reference: input.reference?.trim(),
      approvedTenorWeeks,
    },
  });
  await logRequestAudit({
    requestId: request._id,
    actorType: 'system',
    action: 'loan_created',
    toStatus: request.status,
    metadata: {
      loanId: loan._id.toString(),
      disbursementTransactionId: disbursementTransaction._id.toString(),
      installmentsCreated: installmentDocs.length,
      weeklyTenor: approvedTenorWeeks,
    },
  });

  return request;
};

export const addRequestNote = async (
  requestId: string,
  adminUserId: string,
  note: string
): Promise<IRequestNote> => {
  const request = await Request.findById(requestId).select('_id status').lean();
  if (!request?._id) {
    throw new NotFoundError('Request not found');
  }

  const createdNote = await RequestNote.create({
    requestId: request._id,
    authorType: 'admin',
    authorUserId: toObjectId(adminUserId),
    note: note.trim(),
  });

  await logRequestAudit({
    requestId: request._id,
    actorType: 'admin',
    actorUserId: adminUserId,
    action: 'admin_note_added',
    toStatus: String(request.status),
    metadata: {
      noteId: createdNote._id.toString(),
      noteLength: note.trim().length,
    },
  });

  return createdNote;
};

export const getRequestNotes = async (requestId: string): Promise<IRequestNote[]> => {
  const request = await Request.findById(requestId).select('_id').lean();
  if (!request?._id) {
    throw new NotFoundError('Request not found');
  }

  return RequestNote.find({ requestId: request._id })
    .populate('authorUserId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .exec();
};

export const getRequestAuditTrail = async (
  requestId: string,
  limit = 100
): Promise<IRequestAuditTrail[]> => {
  const request = await Request.findById(requestId).select('_id').lean();
  if (!request?._id) {
    throw new NotFoundError('Request not found');
  }

  return RequestAuditTrail.find({ requestId: request._id })
    .populate('actorUserId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 200)))
    .exec();
};

// Export service object
export const requestService = {
  createRequest,
  getRequestsByRetailerId,
  getRequestsByFarmerId,
  getRequestById,
  moveRequestToAdminReview,
  rejectRequestByAdmin,
  approveRequestByAdmin,
  respondToOfferByRetailer,
  updateRequestStatus,
  updatePaymentStatus,
  verifyRequestOwnership,
  getRequestStats,
  getRequestsForRetailerAdmin,
  getAllRequestsForAdmin,
  disburseRequestByAdmin,
  addRequestNote,
  getRequestNotes,
  getRequestAuditTrail,
};
