import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../utils/error.util.js';
import { IAdminCreateInput, IAdminUpdateInput } from '../interfaces/admin.interface.js';
import { createGetByIdHandler, createUpdateHandler, createExistsCheckHandler } from '../utils/crud.handlers.js';
import { createEntityWithUser } from '../utils/creation.handlers.js';

/**
 * Admin Controller
 * Handles all admin-related HTTP requests
 */

/**
 * Create a new admin
 * POST /api/admins
 */
export const createAdmin = createEntityWithUser({
  role: 'admin',
  roleDisplayName: 'Admin',
  profileService: {
    getByUserId: adminService.getAdminByUserId.bind(adminService),
    updateById: adminService.updateAdminById.bind(adminService),
    create: adminService.createAdmin.bind(adminService),
  },
  buildProfileData: (req: Request, userId: any): IAdminCreateInput => ({
    user_id: userId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    location: req.body.location,
  }),
  getProfileId: (profile: any) => profile._id.toString(),
});

/**
 * Create a Super Admin
 * POST /api/admins/super
 */
export const createSuperAdmin = createEntityWithUser({
  role: 'superadmin',
  roleDisplayName: 'SuperAdmin',
  allowReactivation: false, // SuperAdmin cannot be reactivated
  profileService: {
    getByUserId: adminService.getAdminByUserId.bind(adminService),
    updateById: adminService.updateAdminById.bind(adminService),
    create: adminService.createAdmin.bind(adminService),
  },
  buildProfileData: (req: Request, userId: any): IAdminCreateInput => ({
    user_id: userId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    location: req.body.location,
  }),
  getProfileId: (profile: any) => profile._id.toString(),
});

/**
 * Edit/Update an admin
 * PUT /api/admins/:id
 */
export const editAdmin = createUpdateHandler(
  (id: string, data: IAdminUpdateInput) => adminService.updateAdminById(id, data),
  'id',
  'Admin updated successfully',
  204,
  async (req: Request, id: string) => {
    // Verify admin exists before updating
    await createExistsCheckHandler(adminService.getAdminById.bind(adminService), id, 'Admin');
  },
  (req: Request): IAdminUpdateInput => ({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    location: req.body.location,
    phoneNumber: req.body.phoneNumber,
  })
);

/**
 * Get all admins (Super Admin only)
 * GET /api/admins
 */
export const getAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.user is guaranteed by authenticate middleware
    const admins = await adminService.queryAdmins();
    sendSuccess(res, admins, 'Admins retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single admin by ID
 * GET /api/admins/:id
 */
export const getAdmin = createGetByIdHandler(
  adminService.getAdminById.bind(adminService),
  'id',
  'Admin retrieved successfully'
);

/**
 * Get forms created by admin
 * GET /api/admins/forms
 */
export const getAdminForms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    const forms = await adminService.getFormsCreatedByAdmin(req.userId!);

    sendSuccess(res, forms, 'Admin forms retrieved successfully');
  } catch (error) {
    next(error);
  }
};
