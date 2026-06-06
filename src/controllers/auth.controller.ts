import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { generateTokens, verifyToken } from '../utils/jwt.util.js';
import { generateResetPasswordToken, verifyResetPasswordToken } from '../utils/token.util.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../utils/error.util.js';
import { IUserCreateInput, IJWTPayload } from '../interfaces/user.interface.js';
import { adminService } from '../services/admin.service.js';
import { agentService } from '../services/agent.service.js';
import { userService } from '../services/user.service.js';
import {
  sendResetPasswordEmail,
  sendPasswordResetConfirmationEmail,
} from '../services/email.service.js';
import { otpService } from '../services/otp.service.js';
import { isSuperAdmin, isAdmin, isAgent, isAnyAdmin, getNormalizedRole } from '../utils/role.util.js';

/**
 * Authentication Controller
 * Handles user registration, login, and token refresh
 */

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, passWord, firstName, lastName, phone, role } = req.body as IUserCreateInput;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
    });

    if (existingUser) {
      throw new ConflictError('User with this email or phone already exists');
    }

    // Create new user (⚠️ Using passWord with capital W!)
    const user = new User({
      email: email.toLowerCase(),
      passWord, // ⚠️ Capital W - will be hashed by pre-save hook
      firstName,
      lastName,
      phone,
      role,
      is_active: true, // ⚠️ Snake case
      is_deleted: false,
    });

    // Set role flags based on role
    switch (role) {
      case 'admin':
      case 'superadmin':
        user.isAdmin = true;
        break;
      case 'retailer':
        user.isRetailer = true;
        break;
      case 'merchant':
        user.isMerchant = true;
        break;
      case 'teller':
        user.isTeller = true;
        break;
    }

    await user.save();

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email!,
      role: user.role!,
      isAdmin: user.isAdmin,
      isMerchant: user.isMerchant,
      isRetailer: user.isRetailer,
      isTeller: user.isTeller,
    };

    const tokens = generateTokens(payload);

    sendSuccess(
      res,
      {
        user: user.toJSON(),
        ...tokens,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email (⚠️ Select password fields explicitly)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passWord +password');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (user.is_active === false || user.is_active === 'false') {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Check if user is deleted
    if (user.is_deleted) {
      throw new UnauthorizedError('Account not found');
    }

    // Compare password (⚠️ Method handles both passWord and password fields)
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email!,
      role: user.role!,
      isAdmin: user.isAdmin,
      isMerchant: user.isMerchant,
      isRetailer: user.isRetailer,
      isTeller: user.isTeller,
    };

    const tokens = generateTokens(payload);

    // Enrich user response with role-specific data (like old backend)
    let userDetails: any = {
      email: user.email,
      id: user._id.toString(),
      role: user.role,
    };

    // Get role-specific profile data
    if (isAnyAdmin(user)) {
      const admin = await adminService.getAdminByUserId(user._id.toString());
      if (admin) {
        userDetails = {
          ...userDetails,
          firstName: admin.firstName,
          lastName: admin.lastName,
          adminId: admin._id.toString(),
        };
      }
    } else if (isAgent(user)) {
      const agent = await agentService.getAgentByUserId(user._id.toString());
      if (agent) {
        userDetails = {
          ...userDetails,
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentId: agent._id.toString(),
        };
      }
    }

    sendSuccess(res, {
      user: userDetails,
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Find user to ensure they still exist and are active
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.is_active === false || user.is_active === 'false') {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Generate new tokens
    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email!,
      role: user.role!,
      isAdmin: user.isAdmin,
      isMerchant: user.isMerchant,
      isRetailer: user.isRetailer,
      isTeller: user.isTeller,
    };

    const tokens = generateTokens(payload);

    sendSuccess(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    const user = await User.findById(req.userId!);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Enrich response with role-specific data (like login endpoint)
    let userData: any = user.toJSON();

    // Get role-specific profile data
    if (isAnyAdmin(user)) {
      const admin = await adminService.getAdminByUserId(user._id.toString());
      if (admin) {
        userData = {
          ...userData,
          firstName: admin.firstName,
          lastName: admin.lastName,
          adminId: admin._id.toString(),
        };
      }
    } else if (isAgent(user)) {
      const agent = await agentService.getAgentByUserId(user._id.toString());
      if (agent) {
        userData = {
          ...userData,
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentId: agent._id.toString(),
          imageUrl: agent.image,
          phoneNumber: agent.phoneNumber,
          location: agent.location,
        };
      }
    }

    sendSuccess(res, userData, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side only, just invalidate token)
 * POST /api/auth/logout
 */
export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // The client should remove the token from storage
    // Optionally, you could implement token blacklisting here

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get user details by role (for email sending)
 */
const getUserDetailsByRole = async (user: any): Promise<any> => {
  let userDetails: any = {
    email: user.email,
    id: user._id.toString(),
    role: user.role,
  };

  // Get role-specific profile data
  if (isAnyAdmin(user)) {
    const admin = await adminService.getAdminByUserId(user._id.toString());
    if (admin) {
      userDetails = {
        ...userDetails,
        firstName: admin.firstName,
        lastName: admin.lastName,
      };
    }
  } else if (isAgent(user)) {
    const agent = await agentService.getAgentByUserId(user._id.toString());
    if (agent) {
      userDetails = {
        ...userDetails,
        firstName: agent.firstName,
        lastName: agent.lastName,
      };
    }
  }

  return userDetails;
};

/**
 * Send password reset email
 * POST /api/auth/password-reset-mail
 */
export const sendPasswordResetEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, type = 'link' } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const user = await userService.getUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      const message = type === 'otp'
        ? 'If an account exists with this email, a password reset code has been sent'
        : 'If an account exists with this email, a password reset link has been sent';
      sendSuccess(res, { email }, message);
      return;
    }

    const userDetails = await getUserDetailsByRole(user);

    if (type === 'otp') {
      // Mobile flow: Send OTP code
      // Check rate limiting
      const rateLimitResult = await otpService.canRequestOtp(email, 'password_reset');
      if (!rateLimitResult.canRequest) {
        throw new BadRequestError(rateLimitResult.message || 'Please wait before requesting another code');
      }

      // Create and send OTP
      const otpCode = await otpService.createOtp(email, 'password_reset');
      await otpService.sendOtpEmail(
        email,
        userDetails.firstName || email,
        otpCode,
        'password_reset'
      );

      sendSuccess(res, { email }, 'If an account exists with this email, a password reset code has been sent');
    } else {
      // Web flow: Send reset link with token
      const payload: IJWTPayload = {
        userId: user._id.toString(),
        email: user.email!,
        role: user.role!,
        isAdmin: user.isAdmin,
        isMerchant: user.isMerchant,
        isRetailer: user.isRetailer,
        isTeller: user.isTeller,
      };

      const resetPasswordToken = generateResetPasswordToken(payload);

      // Send email with link
      await sendResetPasswordEmail(
        email,
        userDetails.firstName || userDetails.email,
        resetPasswordToken
      );

      sendSuccess(res, { email }, 'If an account exists with this email, a password reset link has been sent');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password-token
 */
export const resetPasswordWithToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      throw new BadRequestError('Password and token are required');
    }

    // Verify token
    const decoded = verifyResetPasswordToken(token);

    // Update user password
    const user = await userService.updateUserPassword(decoded.userId, password);

    // Get user details for email
    const userDetails = await getUserDetailsByRole(user);

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(user.email!, userDetails.firstName || userDetails.email);

    sendSuccess(res, null, 'Password reset successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      next(new BadRequestError('Reset password token has expired'));
      return;
    }
    if (error instanceof Error && error.message.includes('Invalid')) {
      next(new BadRequestError('Invalid reset password token'));
      return;
    }
    next(error);
  }
};

/**
 * Verify password reset OTP
 * POST /api/auth/verify-reset-otp
 * Used by mobile apps to verify OTP before allowing password reset
 */
export const verifyPasswordResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new BadRequestError('Email and OTP are required');
    }

    // Verify the OTP
    const result = await otpService.verifyOtp(email, otp, 'password_reset');

    if (!result.valid) {
      throw new BadRequestError(result.message || 'Invalid or expired OTP');
    }

    // Generate a temporary token for password reset (valid for 5 minutes)
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const payload: IJWTPayload = {
      userId: user._id.toString(),
      email: user.email!,
      role: user.role!,
      isAdmin: user.isAdmin,
      isMerchant: user.isMerchant,
      isRetailer: user.isRetailer,
      isTeller: user.isTeller,
    };

    const resetToken = generateResetPasswordToken(payload);

    sendSuccess(res, { verified: true, resetToken }, 'OTP verified successfully. You can now reset your password.');
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP (combined verify + reset for mobile)
 * POST /api/auth/reset-password-otp
 * Verifies OTP and resets password in one step
 */
export const resetPasswordWithOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new BadRequestError('Email, OTP, and new password are required');
    }

    // Verify the OTP
    const result = await otpService.verifyOtp(email, otp, 'password_reset');

    if (!result.valid) {
      throw new BadRequestError(result.message || 'Invalid or expired OTP');
    }

    // Get user
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update password
    await userService.updateUserPassword(user._id.toString(), newPassword);

    // Get user details for email
    const userDetails = await getUserDetailsByRole(user);

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(user.email!, userDetails.firstName || userDetails.email);

    sendSuccess(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * POST /api/auth/change-password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new BadRequestError('Old password and new password are required');
    }

    // Get current user
    const user = await userService.getUserById(req.userId!);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify old password
    const isPasswordValid = await userService.verifyUserPassword(user.email!, oldPassword);

    if (!isPasswordValid) {
      throw new BadRequestError('Invalid password');
    }

    // Update password
    await userService.updateUserPassword(req.userId!, newPassword);

    // Get user details for email
    const userDetails = await getUserDetailsByRole(user);

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(user.email!, userDetails.firstName || userDetails.email);

    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (deactivate)
 * POST /api/auth/delete-user
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId and req.user are guaranteed by authenticate middleware
    const { user: userIdToDelete } = req.body;

    if (!userIdToDelete) {
      throw new BadRequestError('User ID is required');
    }

    const userToDelete = await userService.getUserById(userIdToDelete);

    if (!userToDelete) {
      throw new NotFoundError('User not found');
    }

    // Authorization checks based on role of user being deleted
    // Only SuperAdmin can delete admins
    if (isAnyAdmin(userToDelete)) {
      if (!isSuperAdmin(req.user!)) {
        throw new ForbiddenError('Only Super Admin can delete admin users');
      }
    }
    // Agents cannot delete other agents
    else if (isAgent(userToDelete)) {
      if (isAgent(req.user!)) {
        throw new ForbiddenError('Agents cannot delete other agents');
      }
      // Admin can only delete agents they created
      if (isAnyAdmin(req.user!)) {
        const agent = await agentService.getAgentByUserId(userIdToDelete);
        if (!agent || agent.created_by?.toString() !== req.userId) {
          throw new ForbiddenError('You can only delete agents you created');
        }
      }
    }
    // For other roles, check if user is admin or deleting themselves
    else {
      if (!isAnyAdmin(req.user!) && req.userId !== userIdToDelete) {
        throw new ForbiddenError('You can only delete your own account');
      }
    }

    // Deactivate user (soft delete)
    await userService.updateUserById(userIdToDelete, {
      is_active: false,
    });

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};
