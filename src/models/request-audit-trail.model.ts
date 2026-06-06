import mongoose, { Model, Schema } from 'mongoose';
import { IRequestAuditTrail } from '../interfaces/request-audit-trail.interface.js';

interface RequestAuditTrailModel extends Model<IRequestAuditTrail> {}

const requestAuditTrailSchema = new Schema<IRequestAuditTrail, RequestAuditTrailModel>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['admin', 'retailer', 'system'],
      required: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      enum: [
        'request_submitted',
        'invoice_generated',
        'moved_to_under_review',
        'request_rejected_by_admin',
        'request_approved_by_admin',
        'offer_letter_generated',
        'offer_sent',
        'offer_accepted_by_retailer',
        'offer_rejected_by_retailer',
        'request_disbursed',
        'loan_created',
        'admin_note_added',
        'request_status_updated',
      ],
      required: true,
    },
    fromStatus: {
      type: String,
    },
    toStatus: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'requestaudittrails',
    strict: true,
  }
);

requestAuditTrailSchema.index({ requestId: 1, createdAt: -1 });

export const RequestAuditTrail = mongoose.model<IRequestAuditTrail, RequestAuditTrailModel>(
  'RequestAuditTrail',
  requestAuditTrailSchema
);
