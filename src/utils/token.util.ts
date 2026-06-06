import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { IJWTPayload } from '../interfaces/user.interface.js';

/**
 * Token Utilities for reset password tokens
 */

export enum TokenType {
  RESET_PASSWORD = 'resetPassword',
  RESET_PIN = 'resetPin',
  VERIFY_EMAIL = 'verifyEmail',
}

/**
 * Generate reset password token
 * Token expires in 30 minutes
 */
export const generateResetPasswordToken = (payload: IJWTPayload): string => {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.RESET_PASSWORD,
    },
    env.JWT_SECRET,
    {
      expiresIn: '30m', // 30 minutes
    } as jwt.SignOptions
  );
};

/**
 * Verify reset password token
 */
export const verifyResetPasswordToken = (token: string): IJWTPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as IJWTPayload & { type?: string };

    // Verify token type
    if (decoded.type !== TokenType.RESET_PASSWORD) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Reset password token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid reset password token');
    }
    throw error;
  }
};

export const generateResetPinToken = (payload: IJWTPayload): string => {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.RESET_PIN,
    },
    env.JWT_SECRET,
    {
      expiresIn: '30m',
    } as jwt.SignOptions
  );
};

export const verifyResetPinToken = (token: string): IJWTPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as IJWTPayload & { type?: string };

    if (decoded.type !== TokenType.RESET_PIN) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Reset pin token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid reset pin token');
    }
    throw error;
  }
};
