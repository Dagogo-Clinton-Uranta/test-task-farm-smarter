import { Document, Types } from 'mongoose';

export type RequestAuditActorType = 'admin' | 'retailer' | 'system';

export type RequestAuditAction =
  | 'request_submitted'
  | 'invoice_generated'
  | 'moved_to_under_review'
  | 'request_rejected_by_admin'
  | 'request_approved_by_admin'
  | 'offer_letter_generated'
  | 'offer_sent'
  | 'offer_accepted_by_retailer'
  | 'offer_rejected_by_retailer'
  | 'request_disbursed'
  | 'loan_created'
  | 'admin_note_added'
  | 'request_status_updated';

export interface IRequestAuditTrail extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  actorType: RequestAuditActorType;
  actorUserId?: Types.ObjectId;
  action: RequestAuditAction;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
