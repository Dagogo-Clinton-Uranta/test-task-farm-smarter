# Role-Based Access Control System

This document describes the improved role-based access control (RBAC) system implemented in the UFarmX Unified API.

## Overview

The new RBAC system provides a clean, consistent way to handle user roles and permissions **without requiring any database schema changes**. It's designed to work with the existing production database which has inconsistent data (e.g., `role: "SuperAdmin"` with `isAdmin: false`).

## Core Principle

**The `role` field is the source of truth for determining user permissions.**

The old `isAdmin`, `isMerchant`, `isRetailer`, `isTeller` flags are **ignored** for authorization decisions because they are unreliable in the production database.

## User Roles

### Role Hierarchy

```
SuperAdmin (highest privileges)
  ↓
Admin (limited to own resources)
  ↓
Agent, Retailer, Merchant, Teller, Farmer (role-specific access)
```

### Role Definitions

| Role | Database Value | Description | Access Level |
|------|---------------|-------------|--------------|
| **Super Admin** | `"SuperAdmin"` | System administrator | **ALL resources** |
| **Admin** | `"Admin"` | Organization administrator | **Only resources they created** |
| **Agent** | `"Agent"` | Field agent | Forms assigned to them |
| **Retailer** | `"Retailer"` | Product retailer | Retailer-specific features |
| **Merchant** | `"Merchant"` | Merchant user | Merchant-specific features |
| **Teller** | `"Teller"` | Teller user | Teller-specific features |
| **Farmer** | `"Farmer"` | Farmer user | Farmer-specific features |

## Key Distinction: SuperAdmin vs Admin

This is the most important distinction in the system:

### SuperAdmin
- **Role**: `"SuperAdmin"` (case-insensitive)
- **Access**: Sees **EVERYTHING** across the entire platform
- **Examples**:
  - Agents: ALL agents in the system
  - Forms: ALL forms in the system
  - Responses: ALL responses in the system

### Regular Admin
- **Role**: `"Admin"` (case-insensitive)
- **Access**: Sees **ONLY resources they created**
- **Examples**:
  - Agents: Only agents created by this admin (`created_by` field)
  - Forms: Only public forms + forms they created + forms shared with them
  - Responses: Only responses from agents they created

## Utility Functions

All role checking logic is centralized in `/src/utils/role.util.ts`:

### Role Checking Functions

```typescript
import { isSuperAdmin, isAdmin, isAnyAdmin, isAgent, canAccessAllResources } from '../utils/role.util.js';

// Check if user is SuperAdmin
if (isSuperAdmin(req.user)) {
  // User sees EVERYTHING
}

// Check if user is Regular Admin
if (isAdmin(req.user)) {
  // User sees only their own resources
}

// Check if user is any kind of admin (Super or Regular)
if (isAnyAdmin(req.user)) {
  // User has admin privileges
}

// Check if user can access all resources (SuperAdmin only)
if (canAccessAllResources(req.user)) {
  // Shorthand for isSuperAdmin
}

// Check if user is an agent
if (isAgent(req.user)) {
  // Agent-specific logic
}
```

### Helper Functions

```typescript
// Get normalized role (lowercase)
const role = getNormalizedRole(req.user); // 'superadmin', 'admin', 'agent', etc.

// Check multiple roles
if (hasRole(req.user, NormalizedRole.ADMIN, NormalizedRole.SUPER_ADMIN)) {
  // User is admin or superadmin
}

// Require specific role (throws error if not authorized)
requireSuperAdmin(req.user); // Only SuperAdmins pass
requireAdmin(req.user); // SuperAdmin or Admin pass
requireRole(req.user, NormalizedRole.AGENT); // Only Agents pass

// Get display name
const displayName = getRoleDisplayName(req.user); // 'Super Admin', 'Admin', etc.
```

## Middleware

### Authorization Middleware

```typescript
import { authenticate, authorizeAdmin, authorizeSuperAdmin, authorizeRetailer } from '../middlewares/auth.middleware.js';

// Require authentication
router.get('/protected', authenticate, handler);

// Require admin access (SuperAdmin or Admin)
router.get('/admin', authenticate, authorizeAdmin, handler);

// Require SuperAdmin only
router.post('/super-admin-only', authenticate, authorizeSuperAdmin, handler);

// Require retailer access
router.get('/retailer', authenticate, authorizeRetailer, handler);
```

### Generic Authorization

```typescript
import { authorize, NormalizedRole } from '../middlewares/auth.middleware.js';

// Allow specific roles (SuperAdmin always has access)
router.get('/agents-or-admins',
  authenticate,
  authorize(NormalizedRole.AGENT, NormalizedRole.ADMIN),
  handler
);
```

## Controller Patterns

### Pattern 1: SuperAdmin vs Admin Data Access

```typescript
export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result: any[] = [];

    // SuperAdmin sees EVERYTHING
    if (canAccessAllResources(req.user!)) {
      result = await resourceService.queryAll();
    }
    // Regular Admin sees only resources they created
    else if (req.userId) {
      result = await resourceService.getByCreatorId(req.userId);
    }
    else {
      throw new UnauthorizedError('Insufficient permissions');
    }

    sendSuccess(res, result, 'Resources retrieved successfully');
  } catch (error) {
    next(error);
  }
};
```

### Pattern 2: Role-Specific Access

```typescript
export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result: any[] = [];

    // SuperAdmin sees ALL forms
    if (canAccessAllResources(req.user!)) {
      result = await formService.queryForms();
    }
    // Agent sees only forms assigned to them
    else if (isAgent(req.user!) && req.userId) {
      const agent = await agentService.getAgentByUserId(req.userId);
      result = await formService.getFormsByAgentId(agent._id);
    }
    // Regular Admin sees public + own + shared forms
    else if (req.userId) {
      const publicForms = await formService.getPublicForms();
      const ownForms = await formService.getFormsByUserId(req.userId);
      const sharedForms = await formService.getSharedForms(req.userId);
      result = [...publicForms, ...ownForms, ...sharedForms];
    }
    else {
      throw new UnauthorizedError('Insufficient permissions');
    }

    sendSuccess(res, result, 'Forms retrieved successfully');
  } catch (error) {
    next(error);
  }
};
```

## Access Control Examples

### Agents

| User | Access |
|------|--------|
| SuperAdmin | ALL agents in the system |
| Admin | Only agents where `created_by === adminUserId` |
| Agent | Not allowed to list agents |

### Forms

| User | Access |
|------|--------|
| SuperAdmin | ALL forms in the system |
| Admin | Public forms + forms they created + forms shared with them |
| Agent | Only forms assigned to them (`agents` array contains their ID) |

### Form Responses

| User | Access |
|------|--------|
| SuperAdmin | ALL responses in the system |
| Admin | Only responses from agents they created |
| Agent | Only their own responses |

## Migration from Old System

### Before (Old Pattern)

```typescript
// ❌ Unreliable - checks isAdmin flag and role string
if (req.user.isAdmin && req.userId) {
  // SuperAdmin path
} else if (req.userId) {
  // Admin path
}

// ❌ Switch statements with multiple role strings
switch (req.user.role.toLowerCase()) {
  case 'admin':
  case 'superadmin':
    // Logic
    break;
}
```

### After (New Pattern)

```typescript
// ✅ Clean and reliable - uses role field only
if (canAccessAllResources(req.user)) {
  // SuperAdmin path - sees EVERYTHING
} else if (req.userId) {
  // Admin path - sees only own resources
}

// ✅ Clear role checking
if (isSuperAdmin(req.user)) {
  // SuperAdmin-specific logic
}
```

## Benefits

1. **No Database Changes**: Works with existing production data
2. **Single Source of Truth**: `role` field is the authority
3. **Clear Semantics**: `canAccessAllResources()` is self-documenting
4. **Type Safety**: TypeScript enums for role values
5. **Centralized Logic**: All role checking in one utility file
6. **Backwards Compatible**: Handles inconsistent legacy data
7. **Easy to Test**: Pure functions for role checking
8. **SuperAdmin Override**: SuperAdmin always has access in generic authorize()

## Testing

```typescript
// Test user objects
const superAdmin = { role: 'SuperAdmin' };
const admin = { role: 'Admin' };
const agent = { role: 'Agent' };
const legacy = { role: 'SuperAdmin', isAdmin: false }; // Inconsistent data

// All these work correctly
isSuperAdmin(superAdmin);      // true
isSuperAdmin(admin);           // false
canAccessAllResources(legacy); // true (ignores isAdmin flag)
isAnyAdmin(superAdmin);        // true
isAnyAdmin(admin);             // true
isAgent(agent);                // true
```

## Common Pitfalls to Avoid

### ❌ DON'T: Check isAdmin flag
```typescript
if (req.user.isAdmin) { // WRONG - unreliable in production
  // ...
}
```

### ✅ DO: Use role utilities
```typescript
if (isSuperAdmin(req.user)) { // CORRECT
  // ...
}
```

### ❌ DON'T: Hardcode role strings
```typescript
if (req.user.role.toLowerCase() === 'superadmin') { // WRONG - hardcoded
  // ...
}
```

### ✅ DO: Use utility functions or enums
```typescript
if (canAccessAllResources(req.user)) { // CORRECT - semantic
  // ...
}

// OR with enum
if (getNormalizedRole(req.user) === NormalizedRole.SUPER_ADMIN) {
  // ...
}
```

## Future Considerations

1. **Database Cleanup**: Eventually normalize the `isAdmin` flags to match roles
2. **Role Migration**: Create a migration script to fix inconsistent role data
3. **Audit Trail**: Log role-based access decisions for security auditing
4. **Permission Groups**: Consider adding granular permissions beyond roles
5. **Role Assignment**: Add UI for promoting Admin to SuperAdmin

## Summary

The new role system provides:
- ✅ Clean, consistent role checking
- ✅ No database schema changes required
- ✅ Clear SuperAdmin vs Admin distinction
- ✅ Centralized authorization logic
- ✅ Type-safe role handling
- ✅ Backward compatibility with production data

Use the utility functions in `/src/utils/role.util.ts` for all role-related decisions, and the `role` field as the single source of truth.
