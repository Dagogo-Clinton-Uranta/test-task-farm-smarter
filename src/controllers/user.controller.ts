import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/error.util.js';
import { createGetByIdHandler, createUpdateHandler, createDeleteHandler, createExistsCheckHandler } from '../utils/crud.handlers.js';
import { isAnyAdmin, isSuperAdmin, canAccessAllResources } from '../utils/role.util.js';
import { IUserUpdateInput } from '../interfaces/user.interface.js';

/**
 * User Controller
 * Handles all user-related HTTP requests
 */

/**
 * Create a new user
 * POST /api/users
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId and req.user are guaranteed by authenticate middleware
    // Only admins can create users
    const userRole = req.user!.role?.toLowerCase();
    if (!req.user!.isAdmin && userRole !== 'admin' && userRole !== 'superadmin') {
      throw new ForbiddenError('Only admins can create users');
    }

    const { email, passWord, firstName, lastName, phone, role } = req.body;

    if (!email || !passWord || !role) {
      throw new BadRequestError('Email, password, and role are required');
    }

    // Check if user already exists
    const isUserExists = await userService.isUserExists(email);

    if (isUserExists) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await userService.createUser(email, passWord, role);

    // Update additional fields if provided
    if (firstName || lastName || phone) {
      await userService.updateUserById(user._id.toString(), {
        firstName,
        lastName,
        phone,
      });
    }

    // Fetch updated user
    const createdUser = await userService.getUserById(user._id.toString());

    sendSuccess(res, createdUser?.toJSON(), 'User created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with pagination
 * GET /api/users
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId and req.user are guaranteed by authenticate middleware
    // Only admins can get all users
    const userRole = req.user!.role?.toLowerCase();
    if (!req.user!.isAdmin && userRole !== 'admin' && userRole !== 'superadmin') {
      throw new ForbiddenError('Only admins can view all users');
    }

    // Parse query parameters
    const filter: any = {};
    if (req.query.name) {
      filter.name = req.query.name as string;
    }
    if (req.query.role) {
      filter.role = req.query.role as string;
    }
    if (req.query.email) {
      filter.email = req.query.email as string;
    }

    const sortBy = (req.query.sortBy as string) || 'createdAt:desc';
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    const result = await userService.queryUsers({
      filter,
      sortBy,
      limit,
      page,
    });

    sendSuccess(res, result, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/users/:userId
 */
export const getUser = createGetByIdHandler(
  userService.getUserById.bind(userService),
  'userId',
  'User retrieved successfully',
  undefined,
  async (req: Request, id: string) => {
    // Users can only view their own account unless they're admin
    const isOwnAccount = req.userId === id;
    if (!isAnyAdmin(req.user!) && !isOwnAccount) {
      throw new ForbiddenError('You can only view your own account');
    }
  }
);

/**
 * Update user
 * PATCH /api/users/:userId
 */
export const updateUser = createUpdateHandler(
  (id: string, data: IUserUpdateInput) => userService.updateUserById(id, data),
  'userId',
  'User updated successfully',
  200,
  async (req: Request, id: string) => {
    // Users can only update their own account unless they're admin
    const isOwnAccount = req.userId === id;
    if (!isAnyAdmin(req.user!) && !isOwnAccount) {
      throw new ForbiddenError('You can only update your own account');
    }

    const user = await createExistsCheckHandler(userService.getUserById.bind(userService), id, 'User');

    // Check if email is being changed and if it already exists
    const { email } = req.body;
    if (email && email !== user.email) {
      const emailExists = await userService.isUserExists(email);
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }
  },
  (req: Request): IUserUpdateInput => {
    const { firstName, lastName, phone, email, passWord, role } = req.body;
    const isAdmin = isAnyAdmin(req.user!);

    // Build update object
    const updateData: IUserUpdateInput = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (passWord !== undefined) updateData.passWord = passWord;
    if (role !== undefined && isAdmin) updateData.role = role;

    return updateData;
  }
);

/**
 * Delete user (soft delete)
 * DELETE /api/users/:userId
 */
export const deleteUser = createDeleteHandler(
  userService.deleteUserById.bind(userService),
  'userId',
  'User deleted successfully',
  async (req: Request, id: string) => {
    // Users can only delete themselves unless they're admin
    const isOwnAccount = req.userId === id;
    if (!isAnyAdmin(req.user!) && !isOwnAccount) {
      throw new ForbiddenError('You can only delete your own account');
    }

    await createExistsCheckHandler(userService.getUserById.bind(userService), id, 'User');
  }
);
