import { IUser } from '../interfaces/user.interface.js';

/**
 * Role Utilities
 *
 * Centralized role checking system based on production database patterns.
 *
 * IMPORTANT:
 * - Database has inconsistent data: some users have role="SuperAdmin" with isAdmin=false
 * - We use the `role` field as the source of truth, NOT the isAdmin/isMerchant flags
 * - SuperAdmin sees EVERYTHING
 * - Admin sees only resources they created
 */

/**
 * User Role Types (matching production database)
 */
export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  AGENT = 'Agent',
  RETAILER = 'Retailer',
  MERCHANT = 'Merchant',
  TELLER = 'Teller',
  FARMER = 'Farmer',
}

/**
 * Normalized role names (lowercase for comparison)
 */
export enum NormalizedRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  AGENT = 'agent',
  RETAILER = 'retailer',
  MERCHANT = 'merchant',
  TELLER = 'teller',
  FARMER = 'farmer',
}

/**
 * Get normalized role from user (case-insensitive)
 */
export const getNormalizedRole = (user: { role?: string }): string => {
  return user.role?.toLowerCase() || '';
};

/**
 * Check if user is Super Admin
 * SuperAdmin has access to EVERYTHING
 */
export const isSuperAdmin = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.SUPER_ADMIN;
};

/**
 * Check if user is Regular Admin
 * Admin has access only to resources they created
 */
export const isAdmin = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.ADMIN;
};

/**
 * Check if user is any kind of Admin (Super or Regular)
 */
export const isAnyAdmin = (user: { role?: string }): boolean => {
  return isSuperAdmin(user) || isAdmin(user);
};

/**
 * Check if user is Agent
 */
export const isAgent = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.AGENT;
};

/**
 * Check if user is Retailer
 */
export const isRetailer = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.RETAILER;
};

/**
 * Check if user is Merchant
 */
export const isMerchant = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.MERCHANT;
};

/**
 * Check if user is Teller
 */
export const isTeller = (user: { role?: string }): boolean => {
  const role = getNormalizedRole(user);
  return role === NormalizedRole.TELLER;
};

/**
 * Check if user has one of the specified roles
 */
export const hasRole = (user: { role?: string }, ...roles: NormalizedRole[]): boolean => {
  const userRole = getNormalizedRole(user);
  return roles.includes(userRole as NormalizedRole);
};

/**
 * Check if user can access all resources (SuperAdmin only)
 */
export const canAccessAllResources = (user: { role?: string }): boolean => {
  return isSuperAdmin(user);
};

/**
 * Check if user can access only their own resources (Regular Admin)
 */
export const canAccessOwnResourcesOnly = (user: { role?: string }): boolean => {
  return isAdmin(user);
};

/**
 * Get user role display name
 */
export const getRoleDisplayName = (user: { role?: string }): string => {
  const role = getNormalizedRole(user);

  switch (role) {
    case NormalizedRole.SUPER_ADMIN:
      return 'Super Admin';
    case NormalizedRole.ADMIN:
      return 'Admin';
    case NormalizedRole.AGENT:
      return 'Agent';
    case NormalizedRole.RETAILER:
      return 'Retailer';
    case NormalizedRole.MERCHANT:
      return 'Merchant';
    case NormalizedRole.TELLER:
      return 'Teller';
    case NormalizedRole.FARMER:
      return 'Farmer';
    default:
      return user.role || 'Unknown';
  }
};

/**
 * Require specific role (throw error if not authorized)
 */
export const requireRole = (user: { role?: string }, ...allowedRoles: NormalizedRole[]): void => {
  const userRole = getNormalizedRole(user);

  // SuperAdmin always has access
  if (isSuperAdmin(user)) {
    return;
  }

  if (!allowedRoles.includes(userRole as NormalizedRole)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`);
  }
};

/**
 * Require admin access (Super Admin or Regular Admin)
 */
export const requireAdmin = (user: { role?: string }): void => {
  if (!isAnyAdmin(user)) {
    throw new Error('Admin access required');
  }
};

/**
 * Require super admin access only
 */
export const requireSuperAdmin = (user: { role?: string }): void => {
  if (!isSuperAdmin(user)) {
    throw new Error('Super Admin access required');
  }
};
