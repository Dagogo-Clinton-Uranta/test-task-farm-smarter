import { User } from '../models/user.model.js';
import { NotFoundError } from '../utils/error.util.js';

/**
 * User Service
 * Handles user-related operations for agent creation
 */

/**
 * Create a user
 */
export const createUser = async (
  email: string,
  passWord: string,
  role: string
): Promise<any> => {
  const user = new User({
    email: email.toLowerCase(),
    passWord, // Will be hashed by pre-save hook
    role,
    is_active: true,
    is_deleted: false,
  });

  // Set role flags
  switch (role.toLowerCase()) {
    case 'admin':
      user.isAdmin = true;
      break;
    case 'superadmin':
      user.isAdmin = true;
      break;
    case 'retailer':
      user.isRetailer = true;
      break;
    case 'agent':
      // Agent role - no specific flag
      break;
  }

  return await user.save();
};

/**
 * Check if user exists by email
 */
export const isUserExists = async (email: string): Promise<boolean> => {
  const exists = await User.exists({
    email: email.toLowerCase(),
  });
  return !!exists;
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<any> => {
  return await User.findOne({ email: email.toLowerCase() });
};

/**
 * Get user by email with password fields (for authentication)
 */
export const getUserByEmailWithPassword = async (email: string): Promise<any> => {
  return await User.findOne({ email: email.toLowerCase().trim() })
    .select('+passWord +password')
    .exec();
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<any> => {
  return await User.findById(userId);
};

/**
 * Update user by ID
 */
export const updateUserById = async (userId: string, updateData: any): Promise<any> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  Object.assign(user, updateData);
  await user.save();
  return user;
};

/**
 * Check if user is active
 */
export const isUserActive = async (email: string): Promise<boolean> => {
  const user = await User.findOne({
    email: email.toLowerCase(),
    is_active: true,
  });
  return !!user;
};

/**
 * Update user password
 * Password will be hashed by the pre-save hook
 */
export const updateUserPassword = async (userId: string, newPassword: string): Promise<any> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update password (will be hashed by pre-save hook)
  user.passWord = newPassword;
  await user.save();
  return user;
};

/**
 * Verify user password (for login/change password)
 */
export const verifyUserPassword = async (email: string, password: string): Promise<any> => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passWord +password');

  if (!user) {
    return null;
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return null;
  }

  return user;
};

/**
 * Query users with pagination and filtering
 */
export const queryUsers = async (options: {
  filter?: any;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<{
  results: any[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}> => {
  const { filter = {}, sortBy = 'createdAt:desc', limit = 10, page = 1 } = options;

  // Parse sortBy
  const [sortField, sortOrder] = sortBy.split(':');
  const sort: any = {};
  if (sortField) {
    sort[sortField] = sortOrder === 'desc' ? -1 : 1;
  }

  // Build query
  const query: any = { is_deleted: { $ne: true } };

  // Apply filters
  if (filter.name) {
    query.$or = [
      { firstName: { $regex: filter.name, $options: 'i' } },
      { lastName: { $regex: filter.name, $options: 'i' } },
    ];
  }

  if (filter.role) {
    query.role = filter.role;
  }

  if (filter.email) {
    query.email = { $regex: filter.email, $options: 'i' };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query
  const [results, totalResults] = await Promise.all([
    User.find(query)
      .select('-passWord -password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

/**
 * Delete user by ID (soft delete)
 */
export const deleteUserById = async (userId: string): Promise<any> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Soft delete
  user.is_active = false;
  user.is_deleted = true;
  await user.save();

  return user;
};

// Export service object
export const userService = {
  createUser,
  isUserExists,
  getUserByEmail,
  getUserById,
  updateUserById,
  isUserActive,
  updateUserPassword,
  verifyUserPassword,
  queryUsers,
  deleteUserById,
};
