import mongoose from 'mongoose';
import { Admin } from '../models/admin.model.js';
import { NotFoundError } from '../utils/error.util.js';
import { IAdmin, IAdminCreateInput, IAdminUpdateInput, IAdminWithDetails } from '../interfaces/admin.interface.js';

/**
 * Admin Service
 * Handles all admin-related business logic including aggregation pipelines
 */

/**
 * Get base pipeline for admin aggregation
 * Includes user lookup and forms created by admin
 */
const getBaseAdminPipeline = (): any[] => {
  return [
    {
      $lookup: {
        from: 'userdbs',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        'user.is_active': { $ne: false },
      },
    },
    { $unset: 'user.passWord' },
    { $unset: 'user.password' },
    { $unset: 'updatedAt' },
    { $unset: 'createdAt' },
  ];
};

/**
 * Create a new admin
 */
export const createAdmin = async (adminData: IAdminCreateInput): Promise<IAdmin> => {
  const admin = new Admin(adminData);
  return await admin.save();
};

/**
 * Get admin by ID
 */
export const getAdminById = async (id: string): Promise<IAdmin | null> => {
  return await Admin.findById(id).populate({
    path: 'user_id',
    select: '-passWord -password',
  });
};

/**
 * Get admin by user ID
 */
export const getAdminByUserId = async (userId: string): Promise<IAdmin | null> => {
  return await Admin.findOne({ user_id: userId });
};

/**
 * Update admin by ID
 */
export const updateAdminById = async (adminId: string, updateData: IAdminUpdateInput): Promise<IAdmin> => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  Object.assign(admin, updateData);
  await admin.save();
  return admin;
};

/**
 * Query all admins (for Super Admin)
 */
export const queryAdmins = async (): Promise<IAdminWithDetails[]> => {
  const pipeline = getBaseAdminPipeline();
  return await Admin.aggregate(pipeline);
};

/**
 * Get forms created by admin
 */
export const getFormsCreatedByAdmin = async (adminUserId: string): Promise<any[]> => {
  // Get admin by user_id
  const admin = await Admin.findOne({ user_id: adminUserId });

  if (!admin) {
    return [];
  }

  // Get forms where this admin's user_id is the creator (user_id in formdbs)
  const { formService } = await import('./form.service.js');
  return await formService.getFormsByUserId(adminUserId);
};

/**
 * Delete admin by ID
 */
export const deleteAdminById = async (adminId: string): Promise<IAdmin> => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  await admin.deleteOne();
  return admin;
};

// Export service object
export const adminService = {
  createAdmin,
  getAdminById,
  getAdminByUserId,
  updateAdminById,
  queryAdmins,
  getFormsCreatedByAdmin,
  deleteAdminById,
};
