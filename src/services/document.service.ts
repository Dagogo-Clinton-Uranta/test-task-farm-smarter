import mongoose from 'mongoose';
import { Document } from '../models/document.model.js';
import {
  IDocument,
  IDocumentCreateInput,
  IDocumentUpdateInput,
  IDocumentApprovalInput,
  IDocumentQueryFilters,
  IDocumentResponse,
  IDocumentPopulated,
} from '../interfaces/document.interface.js';
import { logger } from '../utils/logger.js';

/**
 * Document Service
 * Handles all document-related business logic
 */

/**
 * Create a new document
 */
export const createDocument = async (
  userId: string,
  input: IDocumentCreateInput
): Promise<IDocument> => {
  const documentData = {
    ...input,
    createdBy: new mongoose.Types.ObjectId(userId),
    request: input.request ? new mongoose.Types.ObjectId(input.request) : undefined,
    farmer: input.farmer ? new mongoose.Types.ObjectId(input.farmer) : undefined,
  };

  const document = new Document(documentData);
  await document.save();

  logger.info('Document created', {
    documentId: document._id.toString(),
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    createdBy: userId,
  });

  return document;
};

/**
 * Get document by ID
 */
export const getDocumentById = async (
  id: string,
  includeDeleted: boolean = false
): Promise<IDocument | null> => {
  const query: any = { _id: id };
  if (!includeDeleted) {
    query.isDeleted = false;
  }

  return await Document.findOne(query)
    .populate('request')
    .populate('retailer', '-passWord -password')
    .populate('farmer')
    .populate('createdBy', '-passWord -password')
    .populate('approvedBy', '-passWord -password')
    .exec();
};

/**
 * Get document by document number
 */
export const getDocumentByNumber = async (
  documentNumber: string
): Promise<IDocument | null> => {
  return await Document.findOne({ documentNumber, isDeleted: false })
    .populate('request')
    .populate('retailer', '-passWord -password')
    .populate('farmer')
    .populate('createdBy', '-passWord -password')
    .populate('approvedBy', '-passWord -password')
    .exec();
};

/**
 * Get documents with filters and pagination
 */
export const getDocuments = async (
  filters: IDocumentQueryFilters
): Promise<{
  documents: IDocument[];
  page: number;
  pages: number;
  total: number;
}> => {
  const {
    documentType,
    approvalStatus,
    request,
    retailer,
    farmer,
    search,
    isActive = true,
    page = 1,
    limit = 10,
  } = filters;

  const query: any = { isDeleted: false };

  if (documentType) {
    query.documentType = documentType;
  }

  if (approvalStatus) {
    query.approvalStatus = approvalStatus;
  }

  if (request) {
    query.request = new mongoose.Types.ObjectId(request);
  }

  if (retailer) {
    query.retailer = new mongoose.Types.ObjectId(retailer);
  }

  if (farmer) {
    query.farmer = new mongoose.Types.ObjectId(farmer);
  }

  if (typeof isActive === 'boolean') {
    query.isActive = isActive;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (page - 1) * limit;
  const total = await Document.countDocuments(query);
  const pages = Math.ceil(total / limit);

  const documents = await Document.find(query)
    .populate('request')
    .populate('retailer', '-passWord -password')
    .populate('farmer')
    .populate('createdBy', '-passWord -password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  return {
    documents,
    page,
    pages,
    total,
  };
};

/**
 * Get documents by request ID
 */
export const getDocumentsByRequestId = async (
  requestId: string
): Promise<IDocument[]> => {
  return await Document.find({ request: requestId, isDeleted: false })
    .populate('createdBy', '-passWord -password')
    .populate('approvedBy', '-passWord -password')
    .sort({ createdAt: -1 })
    .exec();
};

/**
 * Update document
 */
export const updateDocument = async (
  documentId: string,
  input: IDocumentUpdateInput
): Promise<IDocument | null> => {
  return await Document.findByIdAndUpdate(
    documentId,
    { $set: input },
    { new: true, runValidators: true }
  )
    .populate('request')
    .populate('retailer', '-passWord -password')
    .populate('farmer')
    .populate('createdBy', '-passWord -password')
    .populate('approvedBy', '-passWord -password')
    .exec();
};

/**
 * Approve or reject document
 */
export const approveDocument = async (
  documentId: string,
  userId: string,
  input: IDocumentApprovalInput
): Promise<IDocument | null> => {
  const updateData: any = {
    approvalStatus: input.approvalStatus,
    approvedBy: new mongoose.Types.ObjectId(userId),
  };

  if (input.approvalStatus === 'approved') {
    updateData.approvalDate = new Date();
    updateData.approvalNotes = input.approvalNotes;
  } else if (input.approvalStatus === 'rejected') {
    updateData.rejectionReason = input.rejectionReason;
    updateData.approvalNotes = input.approvalNotes;
  } else if (input.approvalStatus === 'revision_requested') {
    updateData.approvalNotes = input.approvalNotes;
    updateData.rejectionReason = input.rejectionReason;
  }

  logger.info('Document approval status updated', {
    documentId,
    approvalStatus: input.approvalStatus,
    approvedBy: userId,
  });

  return await Document.findByIdAndUpdate(documentId, updateData, { new: true })
    .populate('request')
    .populate('retailer', '-passWord -password')
    .populate('farmer')
    .populate('createdBy', '-passWord -password')
    .populate('approvedBy', '-passWord -password')
    .exec();
};

/**
 * Soft delete document
 */
export const deleteDocument = async (documentId: string): Promise<IDocument | null> => {
  logger.info('Document soft deleted', { documentId });

  return await Document.findByIdAndUpdate(
    documentId,
    { $set: { isDeleted: true, isActive: false } },
    { new: true }
  ).exec();
};

/**
 * Hard delete document (use with caution)
 */
export const hardDeleteDocument = async (documentId: string): Promise<boolean> => {
  const result = await Document.findByIdAndDelete(documentId).exec();
  
  if (result) {
    logger.info('Document hard deleted', { documentId });
  }
  
  return !!result;
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (
  retailerId?: string
): Promise<{
  total: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}> => {
  const matchStage: any = { isDeleted: false };
  
  if (retailerId) {
    matchStage.retailer = new mongoose.Types.ObjectId(retailerId);
  }

  const [totalResult, byTypeResult, byStatusResult] = await Promise.all([
    Document.countDocuments(matchStage),
    Document.aggregate([
      { $match: matchStage },
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]),
    Document.aggregate([
      { $match: matchStage },
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
  ]);

  return {
    total: totalResult,
    byType: byTypeResult,
    byStatus: byStatusResult,
  };
};

// Export service object
export const documentService = {
  createDocument,
  getDocumentById,
  getDocumentByNumber,
  getDocuments,
  getDocumentsByRequestId,
  updateDocument,
  approveDocument,
  deleteDocument,
  hardDeleteDocument,
  getDocumentStats,
};
