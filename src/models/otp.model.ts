import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IOtp, IOtpMethods, IOtpModel, OtpPurpose } from '../interfaces/otp.interface.js';

/**
 * OTP Schema for verification codes
 * Collection: test.otps
 *
 * Features:
 * - Bcrypt hashed OTP storage
 * - TTL index for automatic expiration
 * - Rate limiting via attempts counter
 */

const otpSchema = new Schema<IOtp, IOtpModel, IOtpMethods>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'password_reset', 'email_verification', 'pin_reset'],
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - document deleted when expiresAt is reached
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    collection: 'otps', // Exact collection name from production
  }
);

// Compound index for finding valid OTPs
otpSchema.index({ email: 1, purpose: 1, isUsed: 1 });

// Pre-save hook: Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method: Verify OTP
otpSchema.methods.verifyOtp = async function (enteredOtp: string): Promise<boolean> {
  try {
    return await bcrypt.compare(enteredOtp, this.otp);
  } catch {
    return false;
  }
};

// Static method: Find valid (non-expired, non-used) OTP
otpSchema.statics.findValidOtp = async function (
  email: string,
  purpose: OtpPurpose
): Promise<(IOtp & IOtpMethods) | null> {
  return this.findOne({
    email: email.toLowerCase(),
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
};

// Create and export model
export const Otp = mongoose.model<IOtp, IOtpModel>('Otp', otpSchema);
