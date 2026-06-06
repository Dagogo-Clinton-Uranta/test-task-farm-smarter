import mongoose, { Schema, Model } from 'mongoose';
import { IDocument, IDocumentCreateInput } from '../interfaces/document.interface.js';

/**
 * Document Schema
 * Collection: test.documents
 *
 * Relationships:
 * - request -> requests._id (M:1)
 * - retailer -> userdbs._id (M:1)
 * - farmer -> farmers._id (M:1)
 * - createdBy -> userdbs._id (M:1)
 * - approvedBy -> userdbs._id (M:1)
 */

// Interface for static methods
interface IDocumentModel extends Model<IDocument, object, IDocument> {
  generateDocumentNumber(documentType: string): Promise<string>;
}

type DocumentModel = IDocumentModel;

const documentSchema = new Schema<IDocument, DocumentModel>(
  {
    // Document identification
    documentNumber: {
      type: String,
      unique: true,
    },

    // Document type
    documentType: {
      type: String,
      enum: ['RequestInvoice', 'OfferLetter'],
      required: true,
    },

    // References
    request: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
    },
    retailer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Document content
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
      required: true,
    },
    approvalDate: {
      type: Date,
    },
    approvalNotes: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },

    // Additional metadata
    description: {
      type: String,
    },
    notes: {
      type: String,
    },
    tags: [{
      type: String,
    }],

    // Validity
    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

// Indexes for performance
/*documentSchema.index({ documentNumber: 1 }, { unique: true });*/
documentSchema.index({ documentType: 1 });
documentSchema.index({ approvalStatus: 1 });
documentSchema.index({ request: 1 });
documentSchema.index({ retailer: 1 });
documentSchema.index({ farmer: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ approvedBy: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ approvalStatus: 1, createdAt: -1 });
documentSchema.index({ documentType: 1, approvalStatus: 1 });

// Text index for search
documentSchema.index({
  documentNumber: 'text',
  description: 'text',
  notes: 'text',
  tags: 'text',
});

// Static method to generate document number
documentSchema.statics.generateDocumentNumber = async function (documentType: string): Promise<string> {
  const prefix = documentType === 'RequestInvoice' ? 'INV' : 'OFR';
  const year = new Date().getFullYear();
  
  // Find the last document with this prefix
  const lastDoc = await this.findOne({ documentNumber: { $regex: `^${prefix}-${year}` } })
    .sort({ documentNumber: -1 })
    .select('documentNumber');
  
  let sequence = 1;
  if (lastDoc && lastDoc.documentNumber) {
    const lastSequence = lastDoc.documentNumber.split('-')[2];
    if (lastSequence) {
      sequence = parseInt(lastSequence, 10) + 1;
    }
  }
  
  // Pad sequence with zeros (e.g., 001, 002, etc.)
  const sequenceStr = sequence.toString().padStart(4, '0');
  return `${prefix}-${year}-${sequenceStr}`;
};

// Pre-save hook to generate document number if not provided
documentSchema.pre('save', async function (next) {
  if (!this.documentNumber) {
    const Model = this.constructor as IDocumentModel;
    this.documentNumber = await Model.generateDocumentNumber(this.documentType);
  }
  next();
});

// Create and export model
export const Document = mongoose.model<IDocument, DocumentModel>('Document', documentSchema);
