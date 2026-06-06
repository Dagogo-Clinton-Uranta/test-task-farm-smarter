import { Document, Model, Types } from 'mongoose';

/**
 * OTP Interface matching production database schema
 * Collection: test.otps
 *
 * Used for:
 * - Registration verification
 * - Password reset
 * - Email verification
 */

export type OtpPurpose = 'registration' | 'password_reset' | 'email_verification' | 'pin_reset';

/**
 * OTP Document interface
 */
export interface IOtp extends Document {
  _id: Types.ObjectId;
  email: string;
  otp: string;                      // Bcrypt hashed
  purpose: OtpPurpose;
  isUsed: boolean;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OTP instance methods
 */
export interface IOtpMethods {
  /**
   * Verify if entered OTP matches the stored (hashed) OTP
   * @param enteredOtp - Plain text OTP to verify
   * @returns Promise<boolean>
   */
  verifyOtp(enteredOtp: string): Promise<boolean>;
}

/**
 * OTP static methods
 */
export interface IOtpModel extends Model<IOtp, object, IOtpMethods> {
  /**
   * Find a valid (non-expired, non-used) OTP for email and purpose
   * @param email - User email
   * @param purpose - OTP purpose
   * @returns Promise<IOtp | null>
   */
  findValidOtp(email: string, purpose: OtpPurpose): Promise<(IOtp & IOtpMethods) | null>;
}

/**
 * OTP creation input
 */
export interface IOtpCreateInput {
  email: string;
  purpose: OtpPurpose;
}

/**
 * OTP verification input
 */
export interface IOtpVerifyInput {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}

/**
 * OTP verification result
 */
export interface IOtpVerifyResult {
  valid: boolean;
  message: string;
  attemptsRemaining?: number;
}

/**
 * OTP rate limit check result
 */
export interface IOtpRateLimitResult {
  canRequest: boolean;
  waitTimeSeconds?: number;
  message: string;
}
