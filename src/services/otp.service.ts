import { Otp } from '../models/otp.model.js';
import { IOtp, IOtpMethods, OtpPurpose, IOtpVerifyResult, IOtpRateLimitResult } from '../interfaces/otp.interface.js';
import { sendEmail } from './email.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * OTP Service
 * Handles OTP generation, verification, and rate limiting
 */

// OTP expiration time in minutes
const OTP_EXPIRATION_MINUTES = 10;

// Minimum time between OTP requests in seconds
const OTP_RATE_LIMIT_SECONDS = 120;

/**
 * Generate a random 6-digit OTP
 */
export const generateOtpCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and save a new OTP
 * Deletes any existing unused OTPs for the same email/purpose
 */
export const createOtp = async (email: string, purpose: OtpPurpose): Promise<string> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Delete existing unused OTPs for this email/purpose
  await Otp.deleteMany({
    email: normalizedEmail,
    purpose,
    isUsed: false,
  });

  // Generate new OTP
  const otpCode = generateOtpCode();

  console.log("OOOOOOTTTPPPP: ", otpCode);

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRATION_MINUTES);

  // Create OTP document (will be hashed in pre-save hook)
  const otp = new Otp({
    email: normalizedEmail,
    otp: otpCode, // Plain text - will be hashed on save
    purpose,
    expiresAt,
    attempts: 0,
    maxAttempts: 3,
    isUsed: false,
  });

  await otp.save();

  logger.info('OTP created', {
    email: normalizedEmail,
    purpose,
    expiresAt,
  });

  // Return plain text OTP (before hashing)
  return otpCode;
};

/**
 * Verify an OTP
 * Increments attempt counter and marks as used if valid
 */
export const verifyOtp = async (
  email: string,
  enteredOtp: string,
  purpose: OtpPurpose
): Promise<IOtpVerifyResult> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find valid OTP
  const otp = await Otp.findValidOtp(normalizedEmail, purpose);

  if (!otp) {
    return {
      valid: false,
      message: 'Invalid or expired OTP. Please request a new one.',
    };
  }

  // Check if max attempts exceeded
  if (otp.attempts >= otp.maxAttempts) {
    await Otp.deleteOne({ _id: otp._id });
    return {
      valid: false,
      message: 'Maximum verification attempts exceeded. Please request a new OTP.',
    };
  }

  // Increment attempt counter
  otp.attempts += 1;
  await otp.save();

  // Verify OTP
  const isValid = await otp.verifyOtp(enteredOtp);

  if (!isValid) {
    const attemptsRemaining = otp.maxAttempts - otp.attempts;
    return {
      valid: false,
      message: `Invalid OTP. ${attemptsRemaining} attempt(s) remaining.`,
      attemptsRemaining,
    };
  }

  // Mark as used
  otp.isUsed = true;
  await otp.save();

  logger.info('OTP verified successfully', {
    email: normalizedEmail,
    purpose,
  });

  return {
    valid: true,
    message: 'OTP verified successfully.',
  };
};

/**
 * Check if user can request a new OTP (rate limiting)
 */
export const canRequestOtp = async (email: string, purpose: OtpPurpose): Promise<IOtpRateLimitResult> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the most recent OTP for this email/purpose
  const recentOtp = await Otp.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!recentOtp) {
    return {
      canRequest: true,
      message: 'You can request an OTP.',
    };
  }

  // Calculate time since last OTP
  const now = new Date();
  const timeSinceLastOtp = Math.floor((now.getTime() - recentOtp.createdAt.getTime()) / 1000);

  if (timeSinceLastOtp < OTP_RATE_LIMIT_SECONDS) {
    const waitTime = OTP_RATE_LIMIT_SECONDS - timeSinceLastOtp;
    return {
      canRequest: false,
      waitTimeSeconds: waitTime,
      message: `Please wait ${waitTime} seconds before requesting a new OTP.`,
    };
  }

  return {
    canRequest: true,
    message: 'You can request an OTP.',
  };
};

/**
 * Get remaining time for valid OTP
 */
export const getOtpRemainingTime = async (email: string, purpose: OtpPurpose): Promise<number | null> => {
  const normalizedEmail = email.toLowerCase().trim();

  const otp = await Otp.findValidOtp(normalizedEmail, purpose);

  if (!otp) {
    return null;
  }

  const now = new Date();
  const remainingMs = otp.expiresAt.getTime() - now.getTime();

  return remainingMs > 0 ? Math.floor(remainingMs / 1000) : null;
};

/**
 * Send OTP email
 */
export const sendOtpEmail = async (
  email: string,
  firstName: string,
  otp: string,
  purpose: OtpPurpose
): Promise<void> => {
  const baseUrl = env.BASE_URL || 'http://localhost:8000';

  let subject: string;
  let purposeText: string;
  let actionText: string;

  switch (purpose) {
    case 'registration':
      subject = 'Verify Your UFarmX Account';
      purposeText = 'complete your registration';
      actionText = 'verify your email address';
      break;
    case 'password_reset':
      subject = 'Reset Your UFarmX Password';
      purposeText = 'reset your password';
      actionText = 'reset your password';
      break;
    case 'email_verification':
      subject = 'Verify Your Email - UFarmX';
      purposeText = 'verify your email';
      actionText = 'verify your email address';
      break;
    default:
      subject = 'Your UFarmX Verification Code';
      purposeText = 'complete the verification';
      actionText = 'verify your identity';
  }

  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #424242;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .logo {
      max-width: 120px;
      margin-bottom: 20px;
    }
    h1 {
      color: #2E7D32;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .otp-code {
      background: #E8F5E9;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code span {
      font-size: 32px;
      font-weight: bold;
      color: #2E7D32;
      letter-spacing: 8px;
    }
    .warning {
      background: #FFF3E0;
      border-left: 4px solid #FF9800;
      padding: 12px;
      margin-top: 24px;
      font-size: 14px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eeeeee;
      font-size: 12px;
      color: #757575;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img src="${baseUrl}/images/UfarmxLogo.png" class="logo" alt="UFarmX Logo">

      <h1>Hi, ${firstName}!</h1>

      <p>Use the verification code below to ${purposeText}:</p>

      <div class="otp-code">
        <span>${otp}</span>
      </div>

      <p>This code will expire in <strong>${OTP_EXPIRATION_MINUTES} minutes</strong>.</p>

      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone. UFarmX staff will never ask for your verification code.
      </div>

      <div class="footer">
        <p>If you didn't request this code to ${actionText}, you can safely ignore this email.</p>
        <p>&copy; ${new Date().getFullYear()} UFarmX. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await sendEmail(email, firstName, subject, emailTemplate);
    logger.info('OTP email sent', { email, purpose });
  } catch (error: any) {
    logger.error('Failed to send OTP email', {
      error: error.message,
      email,
      purpose,
    });
    // Don't throw - maintain fire-and-forget pattern
  }
};

/**
 * Clean up expired OTPs (for manual cleanup if needed)
 */
export const cleanupExpiredOtps = async (): Promise<number> => {
  const result = await Otp.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  if (result.deletedCount && result.deletedCount > 0) {
    logger.info('Cleaned up expired OTPs', { count: result.deletedCount });
  }

  return result.deletedCount || 0;
};

// Export service object
export const otpService = {
  generateOtpCode,
  createOtp,
  verifyOtp,
  canRequestOtp,
  getOtpRemainingTime,
  sendOtpEmail,
  cleanupExpiredOtps,
};
