import { Document, Types } from 'mongoose';

/**
 * User Interface matching EXACT production database schema
 * Collection: test.userdbs
 *
 * ⚠️ CRITICAL NOTES:
 * - Field names must match exactly (passWord with capital W!)
 * - is_active can be boolean OR string
 * - Both passWord and password fields exist
 * - Snake_case used for some fields (user_id in relationships)
 */

export interface IUser extends Document {
  _id: Types.ObjectId;

  // Authentication fields (⚠️ Note exact casing!)
  email?: string;
  passWord?: string;              // ⚠️ Capital W - main password field
  password?: string;              // ⚠️ Also exists in some docs
  pin?: string;

  // Contact info (⚠️ Multiple variations exist)
  phone?: string;
  phoneNumber?: string;

  // Personal info
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  dateOfBirth?: string;

  // Role flags
  role?: string;
  isAdmin?: boolean;
  isMerchant?: boolean;
  isRetailer?: boolean;
  isTeller?: boolean;

  // Status (⚠️ Can be boolean OR string!)
  is_active: boolean | string;
  is_deleted?: boolean;

  // Profile info
  profilePicture?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * User creation input (for registration)
 */
export interface IUserCreateInput {
  email: string;
  passWord: string;              // ⚠️ Must use capital W
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  is_active?: boolean | string;
}

/**
 * User update input
 */
export interface IUserUpdateInput {
  email?: string;
  passWord?: string;
  pin?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  is_active?: boolean | string;
}

/**
 * User login credentials
 */
export interface IUserLoginInput {
  email: string;
  password: string;
}

/**
 * User response (excluding sensitive data)
 */
export interface IUserResponse {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  isAdmin?: boolean;
  isMerchant?: boolean;
  isRetailer?: boolean;
  isTeller?: boolean;
  is_active: boolean | string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT Payload
 */
export interface IJWTPayload {
  userId: string;
  email: string;
  role: string;
  isAdmin?: boolean;
  isMerchant?: boolean;
  isRetailer?: boolean;
  isTeller?: boolean;
}
