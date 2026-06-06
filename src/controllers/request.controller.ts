import { Request, Response, NextFunction } from 'express';
import { requestService } from '../services/request.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';
import { LoanInstallment } from '../models/loan-installment.model.js';

/**
 * Request Controller
 * Handles all retailer-to-farmer request HTTP endpoints
 */

/**
 * Create a retailer-to-farmer request
 * POST /api/requests/retailer-to-farmer
 */
export const createRetailerToFarmerRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    // Get retailer name from the request body or default to 'Retailer'
    const retailerName = req.body.retailerName || 'Retailer';

    const requestData = req.body;

    const request = await requestService.createRequest(
      userId,
      retailerName,
      requestData
    );

    logger.info('Request created', {
      requestId: request._id.toString(),
      retailerUserId: userId,
      farmerId: requestData.farmerId,
    });

    sendSuccess(res, request, 'Request created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all requests for the logged-in retailer
 * GET /api/requests/retailer
 */
export const getRetailerRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { page, limit, status, search } = req.query;

    const result = await requestService.getRequestsByRetailerId(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
      search: search as string | undefined,
    });

    sendSuccess(res, result, 'Requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all requests for a specific farmer
 * GET /api/requests/farmer/:farmerId
 */
export const getFarmerRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const farmerId = req.params.farmerId!;
    const { page, limit, status } = req.query;

    const result = await requestService.getRequestsByFarmerId(farmerId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
    });

    sendSuccess(res, result, 'Farmer requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get request details by ID
 * GET /api/requests/:id/details
 */
export const getRequestDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;

    const request = await requestService.getRequestById(requestId);

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    const loanInstallments = await LoanInstallment.find({
      requestId: request._id,
    })
      .sort({ leg: 1, installmentNumber: 1 })
      .lean();

    sendSuccess(
      res,
      {
        ...(request.toObject ? request.toObject() : request),
        loanInstallments,
      },
      'Request details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update request status
 * PUT /api/requests/:id/status
 */
export const updateRequestStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const { status, rejectionReason, farmerResponse } = req.body;

    // Get existing request
    const existingRequest = await requestService.getRequestById(requestId);
    if (!existingRequest) {
      throw new NotFoundError('Request not found');
    }

    const userRole = String(req.user?.role || '').toLowerCase();
    const actorType = userRole === 'admin' ? 'admin' : userRole === 'retailer' ? 'retailer' : 'system';
    const request = await requestService.updateRequestStatus(requestId, {
      status,
      rejectionReason,
      farmerResponse,
    }, { actorType, actorUserId: req.userId });

    logger.info('Request status updated', {
      requestId,
      newStatus: status,
    });

    sendSuccess(res, request, 'Request status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment status in payment schedule
 * PUT /api/requests/:id/payment/:paymentNumber
 */
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const paymentNumber = Number(req.params.paymentNumber);
    const { leg, status, paidAmount, paidDate, comment } = req.body;
    const userRole = String(req.user?.role || '').toLowerCase();

    if (isNaN(paymentNumber) || paymentNumber < 1) {
      throw new BadRequestError('Invalid payment number');
    }

    if (userRole === 'retailer') {
      const isOwner = await requestService.verifyRequestOwnership(requestId, req.userId!);
      if (!isOwner) {
        throw new ForbiddenError('You can only update payments for your own requests');
      }
    }

    const effectiveLeg =
      userRole === 'retailer' ? (leg || 'farmer_to_retailer') : leg;

    const request = await requestService.updatePaymentStatus(
      requestId,
      paymentNumber,
      { leg: effectiveLeg, status, paidAmount, paidDate, comment }
    );

    if (!request) {
      throw new NotFoundError('Request or payment not found');
    }

    logger.info('Payment status updated', {
      requestId,
      paymentNumber,
    });

    sendSuccess(res, request, 'Payment status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get request statistics for the logged-in retailer
 * GET /api/requests/retailer/stats
 */
export const getRetailerRequestStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const stats = await requestService.getRequestStats(userId);

    sendSuccess(res, stats, 'Request statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all requests (admin)
 * GET /api/requests/admin
 */
export const getAllRequestsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, status, search } = req.query;

    const result = await requestService.getAllRequestsForAdmin({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
      search: search as string | undefined,
    });

    sendSuccess(res, result, 'Requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Move request from submitted -> admin_under_review
 * POST /api/requests/:id/review
 */
export const adminReviewRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const adminUserId = req.userId!;
    const request = await requestService.moveRequestToAdminReview(requestId, adminUserId);
    sendSuccess(res, request, 'Request moved to admin review successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Reject request by admin
 * POST /api/requests/:id/reject
 */
export const adminRejectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const adminUserId = req.userId!;
    const { reason, note } = req.body;
    const request = await requestService.rejectRequestByAdmin(requestId, { reason, note }, adminUserId);
    sendSuccess(res, request, 'Request rejected successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Approve request by admin and issue offer
 * POST /api/requests/:id/approve
 */
export const adminApproveRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const adminUserId = req.userId!;
    const { coveragePercent, approvedTenorWeeks, note } = req.body;
    const request = await requestService.approveRequestByAdmin(requestId, {
      coveragePercent,
      approvedTenorWeeks,
      note,
    }, adminUserId);
    sendSuccess(res, request, 'Request approved and offer sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Retailer responds to offer
 * POST /api/requests/:id/offer-response
 */
export const retailerOfferResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const userId = req.userId!;
    const { decision, reason } = req.body;

    const request = await requestService.respondToOfferByRetailer(requestId, userId, {
      decision,
      reason,
    });

    sendSuccess(
      res,
      request,
      decision === 'accept'
        ? 'Offer accepted successfully'
        : 'Offer rejected successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Add admin note to request
 * POST /api/requests/:id/notes
 */
export const addAdminRequestNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const adminUserId = req.userId!;
    const { note } = req.body;

    const createdNote = await requestService.addRequestNote(requestId, adminUserId, note);
    sendSuccess(res, createdNote, 'Request note added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin notes for request
 * GET /api/requests/:id/notes
 */
export const getAdminRequestNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const notes = await requestService.getRequestNotes(requestId);
    sendSuccess(res, notes, 'Request notes retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get request audit trail
 * GET /api/requests/:id/audit-trail
 */
export const getAdminRequestAuditTrail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const limit = Number(req.query.limit || 100);
    const trail = await requestService.getRequestAuditTrail(requestId, limit);
    sendSuccess(res, trail, 'Request audit trail retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Disburse request and create loan artifacts
 * POST /api/requests/:id/disburse
 */
export const adminDisburseRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const adminUserId = req.userId!;
    const { amount, reference, note } = req.body;

    const request = await requestService.disburseRequestByAdmin(requestId, adminUserId, {
      amount,
      reference,
      note,
    });
    sendSuccess(res, request, 'Request disbursed and loan created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * View generated invoice HTML for a request
 * GET /api/requests/:id/invoice
 */
export const viewGeneratedInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const request = await requestService.getRequestById(requestId);

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    const products = Array.isArray(request.products) ? request.products : [];
    const productsMarkup = products
      .map((product: any, index: number) => {
        const name = product?.name || `Item ${index + 1}`;
        const quantity = Number(product?.quantity || 0);
        const price = Number(product?.price || 0);
        const lineTotal = quantity * price;
        return `<tr><td>${name}</td><td>${quantity}</td><td>${price.toLocaleString()}</td><td>${lineTotal.toLocaleString()}</td></tr>`;
      })
      .join('');

    const totalAmount =
      Number(request.financingDetails?.totalAmount || request.totalAmount || 0) || 0;
    const downPaymentAmount = Number((request as any).downPaymentAmount || 0) || 0;
    const remainingAmount = Number((request as any).remainingAmount || totalAmount - downPaymentAmount) || 0;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Request Invoice</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1F2937; }
    h1 { margin: 0 0 16px; }
    .meta { margin-bottom: 20px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
    th { background: #F9FAFB; }
    .totals { margin-top: 20px; line-height: 1.7; }
  </style>
</head>
<body>
  <h1>Request Invoice</h1>
  <div class="meta">
    <div><strong>Request ID:</strong> ${request._id.toString()}</div>
    <div><strong>Farmer:</strong> ${request.farmerName || 'N/A'}</div>
    <div><strong>Retailer:</strong> ${(request as any).retailer?.email || 'N/A'}</div>
    <div><strong>Date:</strong> ${new Date(request.createdAt || Date.now()).toLocaleString()}</div>
  </div>
  <table>
    <thead>
      <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${productsMarkup || '<tr><td colspan="4">No items</td></tr>'}
    </tbody>
  </table>
  <div class="totals">
    <div><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</div>
    <div><strong>Down Payment:</strong> ${downPaymentAmount.toLocaleString()}</div>
    <div><strong>Remaining Amount:</strong> ${remainingAmount.toLocaleString()}</div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * View generated offer letter HTML for a request
 * GET /api/requests/:id/offer-letter
 */
export const viewGeneratedOfferLetter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = req.params.id!;
    const request = await requestService.getRequestById(requestId);

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    const coveragePercent = Number((request as any).coveragePercent || 0);
    const approvedTenorWeeks = Number((request as any).approvedTenorWeeks || (request as any).requestedTenorWeeks || 0);
    const totalAmount = Number(request.financingDetails?.totalAmount || request.totalAmount || 0) || 0;
    const downPaymentAmount = Number((request as any).downPaymentAmount || 0) || 0;
    const remainingAmount = Number((request as any).remainingAmount || totalAmount - downPaymentAmount) || 0;
    const adminCoveredAmount = remainingAmount * (coveragePercent / 100);

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Offer Letter</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #1F2937; }
    h1 { margin: 0 0 16px; }
    .meta { margin-bottom: 16px; line-height: 1.7; }
    .box { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; background: #F9FAFB; }
  </style>
</head>
<body>
  <h1>Offer Letter</h1>
  <div class="meta">
    <div><strong>Request ID:</strong> ${request._id.toString()}</div>
    <div><strong>Farmer:</strong> ${request.farmerName || 'N/A'}</div>
    <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
  </div>
  <div class="box">
    <p><strong>Remaining Amount:</strong> ${remainingAmount.toLocaleString()}</p>
    <p><strong>Coverage Percent:</strong> ${coveragePercent}%</p>
    <p><strong>Amount Covered:</strong> ${adminCoveredAmount.toLocaleString()}</p>
    <p><strong>Approved Tenor:</strong> ${approvedTenorWeeks} weeks</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};
