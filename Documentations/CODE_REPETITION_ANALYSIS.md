# Code Repetition Analysis

## 🔍 Analysis Summary

After analyzing the codebase, I've identified significant repetition that can be refactored while maintaining request/response structure and functionality.

## 📊 Repetition Patterns Identified

### 1. **Authentication Checks** (36+ occurrences)
**Pattern:**
```typescript
if (!req.userId) {
  throw new UnauthorizedError('Not authenticated');
}
```

**Location:** Every controller method that requires authentication

**Impact:** High - This is redundant since `authenticate` middleware already sets `req.userId`

**Solution:** Remove these checks - the middleware already handles authentication

---

### 2. **ID Parameter Validation** (31+ occurrences)
**Pattern:**
```typescript
const id = req.params.id;
if (!id) {
  throw new BadRequestError('ID is required');
}
```

**Location:** All controllers with `:id` routes

**Impact:** Medium - Express routes won't match if `:id` is missing, so this check is often unnecessary

**Solution:** Create a reusable middleware or utility function

---

### 3. **Get By ID Pattern** (Repeated 8+ times)
**Pattern:**
```typescript
const id = req.params.id;
if (!id) {
  throw new BadRequestError('ID is required');
}
const entity = await service.getById(id);
if (!entity) {
  throw new NotFoundError('Entity not found');
}
sendSuccess(res, entity, 'Entity retrieved successfully');
```

**Location:** 
- `getAgent()`
- `getAdmin()`
- `getUser()`
- `getFarmer()`
- `getResponseById()`
- `getForm()`

**Solution:** Create a generic `getByIdHandler` utility

---

### 4. **Update Pattern** (Repeated 6+ times)
**Pattern:**
```typescript
const id = req.params.id;
if (!id) {
  throw new BadRequestError('ID is required');
}
const entity = await service.getById(id);
if (!entity) {
  throw new NotFoundError('Entity not found');
}
const updateData = { /* from req.body */ };
await service.updateById(id, updateData);
sendSuccess(res, null, 'Entity updated successfully', 204);
```

**Location:**
- `editAgent()`
- `editAdmin()`
- `updateUser()`
- `updateResponseObject()`
- `updateForm()`

**Solution:** Create a generic `updateHandler` utility

---

### 5. **Delete Pattern** (Repeated 5+ times)
**Pattern:**
```typescript
const id = req.params.id;
if (!id) {
  throw new BadRequestError('ID is required');
}
const entity = await service.getById(id);
if (!entity) {
  throw new NotFoundError('Entity not found');
}
await service.deleteById(id);
sendSuccess(res, null, 'Entity deleted successfully', 204);
```

**Location:**
- `deleteUser()`
- `deleteResponse()`
- `deleteForm()`
- `deleteResponseAnalysis()`

**Solution:** Create a generic `deleteHandler` utility

---

### 6. **Create Agent/Admin Pattern** (Almost Identical)
**Pattern:** Both `createAgent` and `createAdmin` have nearly identical logic:
- Check authentication
- Validate required fields
- Generate password
- Check if user exists
- Reactivate or create user
- Create agent/admin profile
- Send password email

**Location:**
- `agent.controller.ts` - `createAgent()`
- `admin.controller.ts` - `createAdmin()`

**Solution:** Extract common logic to a shared utility function

---

### 7. **Aggregation Pipeline Patterns**
**Pattern:** Similar lookup patterns in multiple services:
- User lookup with password removal
- Active user filtering
- Form/agent/admin lookups

**Location:**
- `agent.service.ts` - `getBaseAgentPipeline()`
- `admin.service.ts` - `getBaseAdminPipeline()`
- `response.service.ts` - Multiple pipelines

**Solution:** Create shared pipeline utilities

---

### 8. **Role-Based Authorization Checks** (Repeated 10+ times)
**Pattern:**
```typescript
if (!req.user.isAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
  throw new ForbiddenError('Admin access required');
}
```

**Location:** Multiple controllers

**Solution:** Already have `authorizeAdmin` middleware, but it's not used consistently

---

### 9. **Response Success Pattern** (36+ occurrences)
**Pattern:**
```typescript
sendSuccess(res, data, 'Entity action successfully');
```

**Location:** Every controller method

**Note:** This is fine - it's a utility function, not repetition

---

## 🎯 Recommended Refactoring

### High Priority (High Impact, Low Risk)

#### 1. **Remove Redundant Authentication Checks**
**Files:** All controllers
**Action:** Remove `if (!req.userId)` checks since `authenticate` middleware already handles this

**Before:**
```typescript
export const getAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) {
      throw new UnauthorizedError('Not authenticated');
    }
    // ... rest of code
```

**After:**
```typescript
export const getAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // req.userId is guaranteed by authenticate middleware
    // ... rest of code
```

**Impact:** Removes 36+ lines of redundant code

---

#### 2. **Create Parameter Validation Middleware**
**Action:** Create `validateParam` middleware

**New File:** `src/middlewares/validation.middleware.ts` (extend existing)

```typescript
export const validateParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const param = req.params[paramName];
    if (!param) {
      throw new BadRequestError(`${paramName} is required`);
    }
    next();
  };
};
```

**Usage:**
```typescript
router.get('/:id', authenticate, validateParam('id'), getAgent);
```

**Impact:** Removes 31+ validation checks from controllers

---

#### 3. **Create Generic CRUD Handlers**
**Action:** Create utility functions for common CRUD operations

**New File:** `src/utils/controller.util.ts`

```typescript
export const getByIdHandler = async <T>(
  req: Request,
  res: Response,
  next: NextFunction,
  service: { getById: (id: string) => Promise<T | null> },
  entityName: string
): Promise<void> => {
  try {
    const id = req.params.id;
    const entity = await service.getById(id);
    
    if (!entity) {
      throw new NotFoundError(`${entityName} not found`);
    }
    
    sendSuccess(res, entity, `${entityName} retrieved successfully`);
  } catch (error) {
    next(error);
  }
};

export const updateHandler = async <T>(
  req: Request,
  res: Response,
  next: NextFunction,
  service: { getById: (id: string) => Promise<T | null>; updateById: (id: string, data: any) => Promise<T> },
  entityName: string,
  updateDataMapper: (req: Request) => any
): Promise<void> => {
  try {
    const id = req.params.id;
    const entity = await service.getById(id);
    
    if (!entity) {
      throw new NotFoundError(`${entityName} not found`);
    }
    
    const updateData = updateDataMapper(req);
    await service.updateById(id, updateData);
    
    sendSuccess(res, null, `${entityName} updated successfully`, 204);
  } catch (error) {
    next(error);
  }
};

export const deleteHandler = async <T>(
  req: Request,
  res: Response,
  next: NextFunction,
  service: { getById: (id: string) => Promise<T | null>; deleteById: (id: string) => Promise<void> },
  entityName: string
): Promise<void> => {
  try {
    const id = req.params.id;
    const entity = await service.getById(id);
    
    if (!entity) {
      throw new NotFoundError(`${entityName} not found`);
    }
    
    await service.deleteById(id);
    sendSuccess(res, null, `${entityName} deleted successfully`, 204);
  } catch (error) {
    next(error);
  }
};
```

**Usage:**
```typescript
export const getAgent = (req: Request, res: Response, next: NextFunction) =>
  getByIdHandler(req, res, next, agentService, 'Agent');
```

**Impact:** Reduces controller code by ~30-40%

---

### Medium Priority (Medium Impact, Medium Risk)

#### 4. **Extract Common Create Logic**
**Action:** Create shared function for agent/admin creation

**New File:** `src/utils/entity-creation.util.ts`

```typescript
export const createEntityWithUser = async (
  email: string,
  passWord: string,
  role: string,
  profileData: any,
  profileService: any,
  entityName: string
) => {
  // Common logic for checking user, reactivating, creating profile, etc.
};
```

**Impact:** Reduces duplication between agent and admin creation

---

#### 5. **Create Shared Aggregation Utilities**
**Action:** Extract common pipeline stages

**New File:** `src/utils/aggregation.util.ts`

```typescript
export const getUserLookupStage = () => ({
  $lookup: {
    from: 'userdbs',
    localField: 'user_id',
    foreignField: '_id',
    as: 'user',
  },
});

export const getActiveUserFilter = () => ({
  $match: {
    'user.is_active': { $ne: false },
  },
});

export const removePasswordFields = () => ({
  $unset: ['user.passWord', 'user.password'],
});
```

**Impact:** Reduces duplication in service aggregation pipelines

---

### Low Priority (Low Impact, Low Risk)

#### 6. **Standardize Error Messages**
**Action:** Create constants for common error messages

**New File:** `src/constants/messages.ts`

```typescript
export const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'Not authenticated',
  ID_REQUIRED: (entity: string) => `${entity} ID is required`,
  NOT_FOUND: (entity: string) => `${entity} not found`,
  // ...
};
```

**Impact:** Consistency and easier maintenance

---

## 📈 Estimated Impact

### Code Reduction
- **Authentication checks**: ~36 lines removed
- **ID validation**: ~31 lines removed
- **CRUD handlers**: ~150-200 lines reduced to ~50 lines
- **Total**: ~200-250 lines of code reduction

### Maintainability Improvement
- Single source of truth for common patterns
- Easier to update validation logic
- Consistent error handling
- Better testability

### Risk Assessment
- **Low Risk**: Removing redundant auth checks (middleware already handles)
- **Medium Risk**: Generic handlers (need to ensure type safety)
- **Low Risk**: Parameter validation middleware (straightforward)

---

## 🚀 Implementation Priority

1. **Phase 1 (Quick Wins)**: Remove redundant auth checks
2. **Phase 2 (High Impact)**: Create parameter validation middleware
3. **Phase 3 (Medium Impact)**: Create generic CRUD handlers
4. **Phase 4 (Nice to Have)**: Extract common creation logic and aggregation utilities

---

## ⚠️ Important Notes

1. **Request/Response Structure**: All refactoring must maintain exact request/response structure
2. **Functionality**: All existing functionality must be preserved
3. **Type Safety**: Generic handlers must maintain TypeScript type safety
4. **Testing**: All refactored code should be tested

---

**Status**: Analysis Complete | Ready for refactoring implementation
