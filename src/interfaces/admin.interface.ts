import { Document, Types } from 'mongoose';

/**
 * Admin Interface matching EXACT production database schema
 * Collection: test.admindbs
 *
 * ⚠️ CRITICAL:
 * - Field names must match exactly (user_id, etc.)
 * - Collection name is 'admindbs' not 'admins'
 */
export interface IAdmin extends Document {
  _id: Types.ObjectId;

  // Required fields
  firstName: string;
  lastName: string;
  phoneNumber: string;

  // Relationships
  user_id: Types.ObjectId; // → userdbs (required)

  // Optional fields
  email?: string;
  password?: string; // Legacy field
  location?: string;
  isActive?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * Admin creation input
 */
export interface IAdminCreateInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  location?: string;
  user_id: Types.ObjectId;
  email?: string;
}

/**
 * Admin update input
 */
export interface IAdminUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  location?: string;
  isActive?: boolean;
}

/**
 * Admin with populated data (from aggregation)
 */
export interface IAdminWithDetails extends IAdmin {
  user?: any;
  forms?: any[];
  id?: string;
}
