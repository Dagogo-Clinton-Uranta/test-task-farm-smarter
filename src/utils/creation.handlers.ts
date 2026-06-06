import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { generatePassword } from './password.util.js';
import { sendPasswordEmail } from '../services/email.service.js';
import { sendSuccess } from './response.util.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from './error.util.js';

/**
 * Generic Creation Handlers
 * Reusable handler functions for creating entities with user accounts
 */

interface ProfileService<T> {
  getByUserId: (userId: string) => Promise<T | null>;
  updateById: (id: string, data: any) => Promise<T | void>;
  create: (data: any) => Promise<T>;
}

interface CreationOptions<T> {
  role: string;
  roleDisplayName: string;
  profileService: ProfileService<T>;
  buildProfileData: (req: Request, userId: any) => any;
  allowReactivation?: boolean;
  getProfileId?: (profile: T) => string;
}

/**
 * Generic handler for creating entities with user accounts
 * Handles user creation, profile creation, password generation, and email sending
 * Supports reactivation of inactive users
 */
export const createEntityWithUser = <T = any>(options: CreationOptions<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, firstName, lastName, location, phoneNumber } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !phoneNumber) {
        throw new BadRequestError('Email, firstName, lastName, and phoneNumber are required');
      }

      // Generate a new password for the user
      const passWord = await generatePassword();

      // Check if the user already exists
      const isUserExists = await userService.isUserExists(email);

      if (isUserExists) {
        const user = await userService.getUserByEmail(email);

        if (!user) {
          throw new NotFoundError('User not found');
        }

        // Check if user is active
        if (user.is_active === true || user.is_active === 'true') {
          throw new ConflictError('User with this email already exists');
        }

        // Reactivation logic (if allowed)
        if (options.allowReactivation !== false) {
          // Reactivate the user and update the password
          await userService.updateUserById(user._id.toString(), {
            is_active: true,
            passWord,
          });

          // Update the profile details
          const profile = await options.profileService.getByUserId(user._id.toString());

          if (!profile) {
            throw new NotFoundError(`${options.roleDisplayName} not found for user`);
          }

          const profileId = options.getProfileId
            ? options.getProfileId(profile)
            : (profile as any)._id.toString();

          await options.profileService.updateById(profileId, {
            firstName,
            lastName,
            phoneNumber,
            location,
          });

          // Send password email
          await sendPasswordEmail(email, firstName, options.roleDisplayName, passWord);

          sendSuccess(res, profile, `${options.roleDisplayName} reactivated successfully`, 201);
          return;
        } else {
          // Reactivation not allowed (e.g., for SuperAdmin)
          throw new ConflictError('User with this email already exists');
        }
      }

      // Create a new user
      const user = await userService.createUser(email, passWord, options.role);

      // Build profile data
      const profileData = options.buildProfileData(req, user._id);

      // Create profile
      const profile = await options.profileService.create(profileData);

      // Send password email
      await sendPasswordEmail(email, firstName, options.roleDisplayName, passWord);

      sendSuccess(res, profile, `${options.roleDisplayName} created successfully`, 201);
    } catch (error) {
      next(error);
    }
  };
};
