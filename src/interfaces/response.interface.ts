import { Document, Types } from 'mongoose';

/**
 * Response Interface matching EXACT production database schema
 * Collection: test.responsesdbs
 *
 * ⚠️ CRITICAL:
 * - Field names must match exactly (form_id, agent_user_id, is_deleted, etc.)
 * - Collection name is 'responsesdbs' not 'responses'
 * - responseObject is a flexible object with many possible fields
 */
export interface IResponse extends Document {
  _id: Types.ObjectId;

  // Required fields
  responseObject: Record<string, any>; // Dynamic data - can have 100+ different keys
  form_id: Types.ObjectId; // → formdbs
  client_submission_id?: string;
  form_version?: number;
  submitted_at_client?: Date;
  attachments_meta?: Array<{
    name: string;
    mimeType: string;
    size: number;
    localKey?: string;
  }>;

  // Optional user references
  agent_user_id?: Types.ObjectId | null; // → userdbs
  admin_user_id?: Types.ObjectId | null; // → userdbs
  last_updated_by?: Types.ObjectId; // → userdbs

  // Soft delete
  is_deleted: boolean; // Default false

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * Response creation input
 */
export interface IResponseCreateInput {
  responseObject: Record<string, any>;
  form_id: Types.ObjectId;
  client_submission_id?: string;
  form_version?: number;
  submitted_at_client?: Date;
  attachments_meta?: Array<{
    name: string;
    mimeType: string;
    size: number;
    localKey?: string;
  }>;
  agent_user_id?: Types.ObjectId | null;
  admin_user_id?: Types.ObjectId | null;
  last_updated_by?: Types.ObjectId;
}

/**
 * Response update input
 */
export interface IResponseUpdateInput {
  responseObject?: Record<string, any>;
  client_submission_id?: string;
  form_version?: number;
  submitted_at_client?: Date;
  attachments_meta?: Array<{
    name: string;
    mimeType: string;
    size: number;
    localKey?: string;
  }>;
  last_updated_by?: Types.ObjectId;
  is_deleted?: boolean;
}
