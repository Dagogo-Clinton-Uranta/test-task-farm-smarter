# Next Steps: Implementation Roadmap

## ✅ Current Status: Authentication Complete

### What's Working
- ✅ User registration and login
- ✅ JWT token generation (access + refresh)
- ✅ Token refresh mechanism
- ✅ Protected routes with authentication middleware
- ✅ Role-based authorization (admin, retailer, etc.)
- ✅ User model with exact database schema preservation
- ✅ Swagger documentation

**Authentication is production-ready!** 🎉

---

## 🎯 Next Phase: User Management Models

According to `UNIFIED_BACKEND_PLAN.md`, Phase 3 is **User Management**. However, we need to create the role-specific models first.

### Priority Order

#### 1. **Admin Model** (Highest Priority)
**Why**: Admins manage the platform and need to be created first.

**Files to Create**:
- `src/interfaces/admin.interface.ts`
- `src/models/admin.model.ts`

**Key Fields** (from `DATABASE_SCHEMA_REFERENCE.md`):
```typescript
{
  user_id: ObjectId,        // → userdbs
  firstName: string,
  lastName: string,
  phoneNumber: string,
  location?: string,
  notes?: string,
  nuban?: string,
  merchantAddress?: string,
  adminMessage?: string,
  adminMessageNotification?: boolean,
  isSuperAdmin?: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Collection**: `admindbs`

---

#### 2. **Agent Model** (High Priority)
**Why**: Agents are core to field operations and farmer management.

**Files to Create**:
- `src/interfaces/agent.interface.ts`
- `src/models/agent.model.ts`

**Key Fields**:
```typescript
{
  user_id?: ObjectId,       // → userdbs
  created_by?: ObjectId,    // → userdbs (admin)
  agentId?: string,
  firstName: string,
  lastName: string,
  phoneNumber: string,
  username?: string,
  gender?: string,
  age?: number,
  country?: string,
  location?: string,
  image?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Collection**: `agentdbs`

---

#### 3. **Retailer Model** (High Priority)
**Why**: Retailers are key stakeholders in the platform.

**Files to Create**:
- `src/interfaces/retailer.interface.ts`
- `src/models/retailer.model.ts`

**Key Fields**:
```typescript
{
  retailer_user_id: ObjectId,  // → userdbs
  companyName: string,
  companyEmail: string,
  phoneNumber: string,
  companyAddress: string,
  price?: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Collection**: `retailers`

---

#### 4. **Farmer Model** (Complex - Do Last)
**Why**: Most complex model with many field variations. Do after simpler models.

**Files to Create**:
- `src/interfaces/farmer.interface.ts`
- `src/models/farmer.model.ts`

**Key Fields** (⚠️ Many variations - see `DATABASE_SCHEMA_REFERENCE.md`):
```typescript
{
  farmerId: string,
  firstName: string,
  lastName: string,
  phone: string,
  location?: string,
  farmSize?: number | string,
  // ... many more fields with variations
  agent_user_id?: ObjectId,    // → userdbs
  retailer_id?: ObjectId,       // → retailers
  inputs?: IFarmerInput[],
  harvests?: IFarmerHarvest[],
  createdAt: Date,
  updatedAt: Date
}
```

**Collection**: `farmers`

**Note**: This model is complex due to field name variations. Reference `DATABASE_SCHEMA_REFERENCE.md` carefully.

---

## 📋 Implementation Checklist

### Step 1: Admin Model
- [ ] Create `src/interfaces/admin.interface.ts`
- [ ] Create `src/models/admin.model.ts`
- [ ] Add indexes for performance
- [ ] Test model with database
- [ ] Add to Swagger schemas

### Step 2: Agent Model
- [ ] Create `src/interfaces/agent.interface.ts`
- [ ] Create `src/models/agent.model.ts`
- [ ] Add indexes for performance
- [ ] Test model with database
- [ ] Add to Swagger schemas

### Step 3: Retailer Model
- [ ] Create `src/interfaces/retailer.interface.ts`
- [ ] Create `src/models/retailer.model.ts`
- [ ] Add indexes for performance
- [ ] Test model with database
- [ ] Add to Swagger schemas

### Step 4: Farmer Model
- [ ] Create `src/interfaces/farmer.interface.ts`
- [ ] Create `src/models/farmer.model.ts`
- [ ] Handle field variations (age, farmSize, etc.)
- [ ] Add indexes for performance
- [ ] Test model with database
- [ ] Add to Swagger schemas

### Step 5: Services Layer
- [ ] Create `src/services/admin.service.ts`
- [ ] Create `src/services/agent.service.ts`
- [ ] Create `src/services/retailer.service.ts`
- [ ] Create `src/services/farmer.service.ts`

### Step 6: Controllers & Routes
- [ ] Create `src/controllers/admin.controller.ts`
- [ ] Create `src/routes/admin.routes.ts`
- [ ] Create `src/controllers/agent.controller.ts`
- [ ] Create `src/routes/agent.routes.ts`
- [ ] Create `src/controllers/retailer.controller.ts`
- [ ] Create `src/routes/retailer.routes.ts`
- [ ] Create `src/controllers/farmer.controller.ts`
- [ ] Create `src/routes/farmer.routes.ts`

### Step 7: Register Routes
- [ ] Add admin routes to `src/app.ts`
- [ ] Add agent routes to `src/app.ts`
- [ ] Add retailer routes to `src/app.ts`
- [ ] Add farmer routes to `src/app.ts`

### Step 8: Documentation
- [ ] Add Swagger documentation for all endpoints
- [ ] Add request/response examples
- [ ] Update API_DOCUMENTATION.md

---

## 🔑 Key Principles

### 1. Database Schema Preservation
⚠️ **CRITICAL**: All field names must match exactly:
- `user_id` (NOT `userId`)
- `is_active` (NOT `isActive`)
- `retailer_user_id` (NOT `retailerUserId`)
- `created_by` (NOT `createdBy`)

### 2. Collection Names
- Use exact collection names: `admindbs`, `agentdbs`, `retailers`, `farmers`
- NOT: `admins`, `agents`, etc.

### 3. Type Handling
- Some fields can be `boolean | string` (e.g., `is_active`)
- Some fields can be `number | string` (e.g., `age`, `farmSize`)
- Use `Schema.Types.Mixed` for flexible types

### 4. Relationships
- Use `Schema.Types.ObjectId` for references
- Add `ref` to schema for population
- Example: `user_id: { type: Schema.Types.ObjectId, ref: 'User' }`

### 5. Indexes
- Add indexes for frequently queried fields
- Example: `email`, `phoneNumber`, `createdAt`, `user_id`

---

## 🚀 Recommended Starting Point

**Start with Admin Model** because:
1. Simplest model (fewer fields)
2. Needed for platform management
3. Good learning example for the pattern
4. Required for creating agents

### Quick Start Command
```bash
# Create files
touch src/interfaces/admin.interface.ts
touch src/models/admin.model.ts
```

Then follow the pattern from `src/models/user.model.ts`:
- Use exact field names
- Add indexes
- Use proper types
- Reference `DATABASE_SCHEMA_REFERENCE.md`

---

## 📚 Reference Documents

1. **`DATABASE_SCHEMA_REFERENCE.md`** - Exact database structure
2. **`src/models/user.model.ts`** - Example model implementation
3. **`UNIFIED_BACKEND_PLAN.md`** - Complete implementation plan
4. **`AUTHENTICATION_REVIEW.md`** - Authentication flow review

---

## 🎯 Success Criteria

Each model is complete when:
- ✅ Interface matches database schema exactly
- ✅ Model compiles without errors
- ✅ Can create, read, update documents
- ✅ Relationships work (populate user_id, etc.)
- ✅ Indexes are created
- ✅ Swagger documentation added

---

**Ready to start? Begin with the Admin Model!** 🚀

