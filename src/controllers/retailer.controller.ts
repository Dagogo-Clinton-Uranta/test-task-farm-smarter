import { Request, Response, NextFunction } from 'express';
import { retailerService } from '../services/retailer.service.js';
import { retailerProductService } from '../services/retailer-product.service.js';
import { requestService } from '../services/request.service.js';
import { otpService } from '../services/otp.service.js';
import { sendOtpSms } from '../services/sms.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/error.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { generateResetPinToken, verifyResetPinToken } from '../utils/token.util.js';
import { logger } from '../utils/logger.js';
import { getBankOptions } from '../services/bank.service.js';

/**
 * Retailer Controller
 * Handles all retailer-related HTTP requests
 */

/**
 * Register a new retailer
 * POST /api/retailers/register
 */
export const registerRetailer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, passWord, firstName, lastName, phoneNumber, ...businessData } = req.body;

    // Check if email is already registered
    const emailExists = await retailerService.isEmailRegistered(email);
    if (emailExists) {
      throw new ConflictError('Email is already registered');
    }

    // Check if phone is already registered
    const phoneExists = await retailerService.isPhoneRegistered(phoneNumber);
    if (phoneExists) {
      throw new ConflictError('Phone number is already registered');
    }

    // Create retailer with user account
    const { user, retailer } = await retailerService.createRetailerWithUser({
      email,
      passWord,
      firstName,
      lastName,
      phoneNumber,
      ...businessData,
    });

    // Generate and send OTP
    const otp = await otpService.createOtp(email, 'registration');
    await otpService.sendOtpEmail(email, firstName, otp, 'registration');

    // Generate tokens (user can use app while awaiting verification)
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    logger.info('Retailer registered', {
      userId: user._id.toString(),
      email,
    });

    sendSuccess(
      res,
      {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isRetailer: user.isRetailer,
          is_active: user.is_active,
        },
        retailer: {
          _id: retailer._id,
          businessName: retailer.businessName,
          phoneNumber: retailer.phoneNumber,
        },
        accessToken,
        refreshToken,
        requiresVerification: true,
      },
      'Registration successful. Please verify your email with the OTP sent.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP for retailer registration
 * POST /api/retailers/verify-otp
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Verify OTP
    const result = await otpService.verifyOtp(email, otp, 'registration');

    if (!result.valid) {
      throw new BadRequestError(result.message);
    }

    // Get user by email
    const user = await retailerService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Activate retailer account
    await retailerService.activateRetailer(user._id.toString());

    // Generate new tokens with active status
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    logger.info('Retailer OTP verified', { email });

    sendSuccess(res, {
      verified: true,
      accessToken,
      refreshToken,
    }, 'Email verified successfully. Your account is now active.');
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP for retailer
 * POST /api/retailers/resend-otp
 */
export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    // Check rate limit
    const rateLimit = await otpService.canRequestOtp(email, 'registration');
    if (!rateLimit.canRequest) {
      throw new BadRequestError(rateLimit.message);
    }

    // Get user to verify they exist
    const user = await retailerService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestError('No account found with this email');
    }

    // Generate and send new OTP
    const otp = await otpService.createOtp(email, 'registration');
    await otpService.sendOtpEmail(email, user.firstName || 'User', otp, 'registration');

    logger.info('OTP resent', { email });

    sendSuccess(res, {
      sent: true,
    }, 'OTP sent successfully. Please check your email.');
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new retailer with phone number only (phone-based flow)
 * POST /api/retailers/phone-register
 */
export const phoneRegisterRetailer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    // Normalize: strip leading + so lookup and storage are consistent
    const normalizedPhone = phoneNumber.replace(/^\+/, '');

    // Check if phone is already registered
    const phoneExists = await retailerService.isPhoneRegistered(phoneNumber) ||
      await retailerService.isPhoneRegistered(`+${normalizedPhone}`);
    if (phoneExists) {
      throw new ConflictError('Phone number is already registered');
    }

    // Generate synthetic email and password for the user record
    const syntheticEmail = `phone_${normalizedPhone}@ufarmx.app`;
    const syntheticPassword = `auto_${normalizedPhone}_${Date.now()}`;

    // Check if synthetic email already exists (re-registration attempt)
    const emailExists = await retailerService.isEmailRegistered(syntheticEmail);
    if (emailExists) {
      throw new ConflictError('Phone number is already registered');
    }

    // Create retailer with synthetic email
    const { user } = await retailerService.createRetailerWithUser({
      email: syntheticEmail,
      passWord: syntheticPassword,
      firstName: '',
      lastName: '',
      phoneNumber: `+${normalizedPhone}`,
    });

    // Generate and send OTP via SMS (use phone as the OTP key)
    const otp = await otpService.createOtp(normalizedPhone, 'registration');
    await sendOtpSms(`+${normalizedPhone}`, otp);

    logger.info('Phone registration initiated', { phone: normalizedPhone });

    sendSuccess(
      res,
      { requiresVerification: true },
      'OTP sent to your phone number.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a retailer exists for a phone number
 * POST /api/retailers/check-phone
 */
export const checkRetailerPhone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    const normalizedPhone = phoneNumber.replace(/^\+/, '');

    const exists =
      await retailerService.isPhoneRegistered(phoneNumber) ||
      await retailerService.isPhoneRegistered(`+${normalizedPhone}`);

    sendSuccess(
      res,
      { exists, phoneNumber: `+${normalizedPhone}` },
      exists ? 'Phone number found.' : 'Phone number is not registered.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get supported bank options for onboarding
 * GET /api/retailers/banks
 */
export const getRetailerBanks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const banks = await getBankOptions();

    sendSuccess(res, banks, 'Banks retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Login retailer with phone number and PIN
 * POST /api/retailers/pin-login
 */
export const loginRetailerWithPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber, pin } = req.body;
    const normalizedPhone = phoneNumber.replace(/^\+/, '');

    const retailer =
      await retailerService.getRetailerByPhone(phoneNumber) ||
      await retailerService.getRetailerByPhone(`+${normalizedPhone}`);

    if (!retailer?.retailer_user_id) {
      throw new UnauthorizedError('Invalid phone number or PIN');
    }

    const userWithPin = await retailerService.getUserByIdWithPin(retailer.retailer_user_id.toString());

    if (!userWithPin || !userWithPin.isRetailer) {
      throw new UnauthorizedError('Invalid phone number or PIN');
    }

    if (userWithPin.is_active === false || userWithPin.is_active === 'false' || userWithPin.is_deleted) {
      throw new UnauthorizedError('Account is unavailable');
    }

    const isPinValid = await userWithPin.comparePin(pin);

    if (!isPinValid) {
      throw new UnauthorizedError('Invalid phone number or PIN');
    }

    const accessToken = generateAccessToken({
      userId: userWithPin._id.toString(),
      email: userWithPin.email || `phone_${normalizedPhone}@ufarmx.app`,
      role: userWithPin.role || 'Retailer',
      isRetailer: true,
    });

    const refreshToken = generateRefreshToken({
      userId: userWithPin._id.toString(),
      email: userWithPin.email || `phone_${normalizedPhone}@ufarmx.app`,
      role: userWithPin.role || 'Retailer',
      isRetailer: true,
    });

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          _id: userWithPin._id,
          email: userWithPin.email,
          role: userWithPin.role,
          isRetailer: userWithPin.isRetailer,
          phoneNumber: userWithPin.phoneNumber || userWithPin.phone,
        },
      },
      'PIN login successful.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Send forgot PIN OTP
 * POST /api/retailers/forgot-pin
 */
export const forgotRetailerPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    const normalizedPhone = phoneNumber.replace(/^\+/, '');

    const retailer =
      await retailerService.getRetailerByPhone(phoneNumber) ||
      await retailerService.getRetailerByPhone(`+${normalizedPhone}`);

    if (!retailer) {
      throw new BadRequestError('No account found for this phone number');
    }

    const rateLimit = await otpService.canRequestOtp(normalizedPhone, 'pin_reset');
    if (!rateLimit.canRequest) {
      throw new BadRequestError(rateLimit.message);
    }

    const otp = await otpService.createOtp(normalizedPhone, 'pin_reset');
    await sendOtpSms(`+${normalizedPhone}`, otp);

    sendSuccess(res, { sent: true }, 'OTP sent successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify forgot PIN OTP
 * POST /api/retailers/verify-pin-reset-otp
 */
export const verifyRetailerPinResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = phone.replace(/^\+/, '');

    const result = await otpService.verifyOtp(normalizedPhone, otp, 'pin_reset');
    if (!result.valid) {
      throw new BadRequestError(result.message || 'Invalid or expired OTP');
    }

    const retailer =
      await retailerService.getRetailerByPhone(phone) ||
      await retailerService.getRetailerByPhone(`+${normalizedPhone}`);

    if (!retailer?.retailer_user_id) {
      throw new BadRequestError('Account not found. Please try again.');
    }

    const user = await retailerService.getUserByIdWithPin(retailer.retailer_user_id.toString());
    if (!user) {
      throw new BadRequestError('Account not found. Please try again.');
    }

    const resetToken = generateResetPinToken({
      userId: user._id.toString(),
      email: user.email || `phone_${normalizedPhone}@ufarmx.app`,
      role: user.role || 'Retailer',
      isRetailer: user.isRetailer,
      isAdmin: user.isAdmin,
      isMerchant: user.isMerchant,
      isTeller: user.isTeller,
    });

    sendSuccess(res, { verified: true, resetToken }, 'OTP verified successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Reset retailer PIN
 * POST /api/retailers/reset-pin
 */
export const resetRetailerPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, pin } = req.body;

    if (!token || !pin) {
      throw new BadRequestError('Reset token and PIN are required');
    }

    const decoded = verifyResetPinToken(token);
    await retailerService.setRetailerPin(decoded.userId, pin);

    sendSuccess(res, { pinReset: true }, 'PIN reset successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      next(new BadRequestError('Reset pin token has expired'));
      return;
    }
    if (error instanceof Error && error.message.includes('Invalid')) {
      next(new BadRequestError('Invalid reset pin token'));
      return;
    }
    next(error);
  }
};

/**
 * Verify SMS OTP for phone-based registration
 * POST /api/retailers/verify-sms-otp
 */
export const verifySmsOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = phone.replace(/^\+/, '');

    // Verify OTP using phone as key
    const result = await otpService.verifyOtp(normalizedPhone, otp, 'registration');
    if (!result.valid) {
      throw new BadRequestError(result.message);
    }

    // Get user by synthetic email
    const syntheticEmail = `phone_${normalizedPhone}@ufarmx.app`;
    const user = await retailerService.getUserByEmail(syntheticEmail);
    if (!user) {
      throw new BadRequestError('Account not found. Please register again.');
    }

    // Activate the account
    await retailerService.activateRetailer(user._id.toString());

    // Issue tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: 'Retailer',
      isRetailer: true,
    });

    logger.info('Phone OTP verified', { phone: normalizedPhone });

    sendSuccess(res, {
      verified: true,
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isRetailer: user.isRetailer,
      },
    }, 'Phone verified successfully. Your account is now active.');
  } catch (error) {
    next(error);
  }
};

/**
 * Resend SMS OTP for phone-based registration
 * POST /api/retailers/resend-sms-otp
 */
export const resendSmsOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone } = req.body;
    const normalizedPhone = phone.replace(/^\+/, '');

    // Rate limit check
    const rateLimit = await otpService.canRequestOtp(normalizedPhone, 'registration');
    if (!rateLimit.canRequest) {
      throw new BadRequestError(rateLimit.message);
    }

    // Verify account exists
    const syntheticEmail = `phone_${normalizedPhone}@ufarmx.app`;
    const user = await retailerService.getUserByEmail(syntheticEmail);
    if (!user) {
      throw new BadRequestError('No account found for this phone number');
    }

    const otp = await otpService.createOtp(normalizedPhone, 'registration');
    await sendOtpSms(`+${normalizedPhone}`, otp);

    logger.info('SMS OTP resent', { phone: normalizedPhone });

    sendSuccess(res, { sent: true }, 'OTP sent successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current retailer's profile
 * GET /api/retailers/profile
 */
export const getRetailerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const retailer = await retailerService.getRetailerWithUser(userId);

    if (!retailer) {
      throw new BadRequestError('Retailer profile not found');
    }

    sendSuccess(res, retailer, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update current retailer's profile
 * PUT /api/retailers/profile
 */
export const updateRetailerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const updateData = req.body;

    const retailer = await retailerService.updateRetailerProfile(userId, updateData);

    if (!retailer) {
      throw new BadRequestError('Retailer profile not found');
    }

    logger.info('Retailer profile updated', { userId });

    sendSuccess(res, retailer, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Setup retailer PIN
 * POST /api/retailers/setup-pin
 */
export const setupRetailerPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { pin } = req.body;

    await retailerService.setRetailerPin(userId, pin);

    logger.info('Retailer PIN set', { userId });

    sendSuccess(
      res,
      { pinConfigured: true },
      'PIN configured successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all retailers (admin only)
 * GET /api/retailers
 */
export const getAllRetailers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string | undefined;

    const result = await retailerService.getAllRetailers(page, limit, search);

    sendSuccess(res, result, 'Retailers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRetailerByIdAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const retailerId = req.params.id!;
    const retailer = await retailerService.getRetailerByIdWithUser(retailerId);

    if (!retailer) {
      throw new BadRequestError('Retailer not found');
    }

    sendSuccess(res, retailer, 'Retailer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRetailerProductsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const retailerId = req.params.id!;
    const { page, limit, category, status, search } = req.query;

    const retailer = await retailerService.getRetailerById(retailerId);
    if (!retailer) {
      throw new BadRequestError('Retailer not found');
    }

    const result = await retailerProductService.getProductsByRetailerId(
      retailer.retailer_user_id.toString(),
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        category: category as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      }
    );

    sendSuccess(res, result, 'Retailer products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRetailerRequestsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const retailerId = req.params.id!;
    const { page, limit, status, search, direction } = req.query;

    const retailer = await retailerService.getRetailerById(retailerId);
    if (!retailer) {
      throw new BadRequestError('Retailer not found');
    }

    const result = await requestService.getRequestsForRetailerAdmin(
      retailer.retailer_user_id.toString(),
      retailerId,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        direction: (direction as 'raised' | 'received' | 'all' | undefined) || 'all',
      }
    );

    sendSuccess(res, result, 'Retailer requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};
