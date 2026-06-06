import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/error.util.js';
import { IDocumentCreateInput, IDocumentUpdateInput, IDocumentApprovalInput, DocumentType, ApprovalStatus } from '../interfaces/document.interface.js';
import { logger } from '../utils/logger.js';

/**
 * Document Controller
 * Handles all document-related HTTP requests
 */

/**
 * Create a new document
 * POST /api/documents
 */
export const createDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const documentData: IDocumentCreateInput = req.body;

    // Validate required fields
    if (!documentData.documentType) {
      throw new BadRequestError('Document type is required');
    }
    if (!documentData.fileUrl) {
      throw new BadRequestError('File URL is required');
    }
    if (!documentData.fileName) {
      throw new BadRequestError('File name is required');
    }

    const document = await documentService.createDocument(userId, documentData);

    sendSuccess(res, document, 'Document created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documents with filters
 * GET /api/documents
 */
export const getAllDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      documentType,
      approvalStatus,
      request,
      farmer,
      search,
      isActive,
      page,
      limit,
    } = req.query;

    const filters = {
      documentType: (documentType ? (documentType as DocumentType) : undefined),
      approvalStatus: (approvalStatus ? (approvalStatus as ApprovalStatus) : undefined),
      request: request as string,
      farmer: farmer as string,
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    };

    const result = await documentService.getDocuments(filters);

    sendSuccess(res, result, 'Documents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get document by ID
 * GET /api/documents/:id
 */
export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documentId = req.params.id;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    const document = await documentService.getDocumentById(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    sendSuccess(res, document, 'Document retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get document by document number
 * GET /api/documents/number/:documentNumber
 */
export const getDocumentByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { documentNumber } = req.params;

    if (!documentNumber) {
      throw new BadRequestError('Document number is required');
    }

    const document = await documentService.getDocumentByNumber(documentNumber);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    sendSuccess(res, document, 'Document retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get documents by request ID
 * GET /api/documents/request/:requestId
 */
export const getDocumentsByRequestId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      throw new BadRequestError('Request ID is required');
    }

    const documents = await documentService.getDocumentsByRequestId(requestId);

    sendSuccess(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update document
 * PUT /api/documents/:id
 */
export const updateDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documentId = req.params.id;
    const updateData: IDocumentUpdateInput = req.body;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    const document = await documentService.updateDocument(documentId, updateData);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    logger.info('Document updated', {
      documentId,
      updatedBy: req.userId,
    });

    sendSuccess(res, document, 'Document updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject document
 * PUT /api/documents/:id/approval
 */
export const approveDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documentId = req.params.id;
    const approvalData: IDocumentApprovalInput = req.body;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    if (!approvalData.approvalStatus) {
      throw new BadRequestError('Approval status is required');
    }

    const validStatuses = ['approved', 'rejected', 'revision_requested'];
    if (!validStatuses.includes(approvalData.approvalStatus)) {
      throw new BadRequestError('Invalid approval status. Must be approved, rejected, or revision_requested');
    }

    const document = await documentService.approveDocument(
      documentId,
      req.userId!,
      approvalData
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    logger.info('Document approval status updated', {
      documentId,
      approvalStatus: approvalData.approvalStatus,
      approvedBy: req.userId,
    });

    sendSuccess(res, document, 'Document approval status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete document (soft delete)
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documentId = req.params.id;

    if (!documentId) {
      throw new BadRequestError('Document ID is required');
    }

    const document = await documentService.deleteDocument(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    logger.info('Document deleted', {
      documentId,
      deletedBy: req.userId,
    });

    sendSuccess(res, { _id: documentId }, 'Document deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get document statistics
 * GET /api/documents/stats
 */
export const getDocumentStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { retailerId } = req.query;

    const stats = await documentService.getDocumentStats(
      retailerId as string
    );

    sendSuccess(res, stats, 'Document statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
