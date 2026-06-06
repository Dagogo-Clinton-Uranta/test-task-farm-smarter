import { Document, Types } from 'mongoose';

/**
 * Document Type Enum
 * Types of documents that can be generated in the system
 */
export type DocumentType = 'RequestInvoice' | 'OfferLetter';

/**
 * Approval Status Enum
 * Status of document approval workflow
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

/**
 * Document Interface
 * Collection: test.documents
 *
 * Relationships:
 * - request -> requests._id (M:1)
 * - retailer -> userdbs._id (M:1)
 * - farmer -> farmers._id (M:1)
 * - createdBy -> userdbs._id (M:1)
 * - approvedBy -> userdbs._id (M:1)
 */
export interface IDocument extends Document {
  _id: Types.ObjectId;

  // Document identification
  documentNumber?: string;  // Unique document number (e.g., INV-2024-001), auto-generated
  documentType: DocumentType;

  // References
  request?: Types.ObjectId;           // Reference to associated request
  retailer?: Types.ObjectId;          // Reference to retailer (userdbs)
  farmer?: Types.ObjectId;            // Reference to farmer (farmers)
  createdBy?: Types.ObjectId;         // User who created the document
  approvedBy?: Types.ObjectId;        // User who approved the document

  // Document content
  fileUrl: string;                    // URL/path to the document file
  fileName: string;                   // Original file name
  fileSize?: number;                  // File size in bytes
  mimeType?: string;                  // MIME type of the file

  // Approval workflow
  approvalStatus: ApprovalStatus;
  approvalDate?: Date;
  approvalNotes?: string;
  rejectionReason?: string;

  // Additional metadata
  description?: string;
  notes?: string;
  tags?: string[];

  // Validity
  validFrom?: Date;
  validUntil?: Date;

  // Status
  isActive: boolean;
  isDeleted: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;

  // Metadata
  __v?: number;
}

/**
 * Document creation input
 */
export interface IDocumentCreateInput {
  documentType: DocumentType;
  request?: string;
  farmer?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * Document update input
 */
export interface IDocumentUpdateInput {
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  approvalStatus?: ApprovalStatus;
  approvalNotes?: string;
  rejectionReason?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}

/**
 * Approval input
 */
export interface IDocumentApprovalInput {
  approvalStatus: 'approved' | 'rejected' | 'revision_requested';
  approvalNotes?: string;
  rejectionReason?: string;
}

/**
 * Document response (safe to return to client)
 */
export interface IDocumentResponse {
  _id: string;
  documentNumber?: string;
  documentType: DocumentType;
  request?: string;
  retailer?: string;
  farmer?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  approvalStatus: ApprovalStatus;
  approvalDate?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Document query filters
 */
export interface IDocumentQueryFilters {
  documentType?: DocumentType;
  approvalStatus?: ApprovalStatus;
  request?: string;
  retailer?: string;
  farmer?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Paginated documents response
 */
export interface IPaginatedDocuments {
  documents: IDocumentResponse[];
  page: number;
  pages: number;
  total: number;
}

/**
 * Document with populated references
 */
export interface IDocumentPopulated extends Omit<IDocument, 'request' | 'retailer' | 'farmer' | 'createdBy' | 'approvedBy'> {
  request?: {
    _id: Types.ObjectId;
    farmerName: string;
    status: string;
  };
  retailer?: {
    _id: Types.ObjectId;
    businessName?: string;
    email?: string;
    phone?: string;
  };
  farmer?: {
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  createdBy?: {
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  approvedBy?: {
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}
