# Code Improvements Plan

Based on the best practices review, here's a prioritized plan to improve code quality.

## 🚀 Phase 1: Critical Improvements (Week 1)

### 1. Implement Winston Logger ✅ Ready to Use

**Status**: Logger utility created at `src/utils/logger.ts`

**Next Steps**:
1. Replace all `console.log()` → `logger.info()`
2. Replace all `console.error()` → `logger.error()`
3. Replace all `console.warn()` → `logger.warn()`

**Files to Update**:
- `src/services/email.service.ts` (6 instances)
- `src/services/response.service.ts` (5 instances)
- `src/services/form.service.ts` (1 instance)
- `src/models/user.model.ts` (1 instance)
- `src/config/database.ts` (5 instances)
- `src/server.ts` (8 instances)
- `src/middlewares/error.middleware.ts` (2 instances)

**Example Migration**:
```typescript
// Before
console.error('Error sending email:', error);

// After
import { logger } from '../utils/logger.js';
logger.error('Error sending email', { error: error.message, stack: error.stack });
```

---

### 2. Add Input Validation Schemas

**Create**: `src/validations/agent.validation.ts`
```typescript
import Joi from 'joi';

export const createAgentSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  location: Joi.string().optional(),
});

export const updateAgentSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phoneNumber: Joi.string().optional(),
  location: Joi.string().optional(),
  adminId: Joi.string().optional(),
});
```

**Create**: `src/validations/form.validation.ts`
```typescript
// Form validation schemas
```

**Update Routes**: Add `validate()` middleware to all routes

---

### 3. Add Basic Unit Tests

**Create**: `src/__tests__/services/agent.service.test.ts`
```typescript
import { agentService } from '../../services/agent.service';

describe('Agent Service', () => {
  describe('createAgent', () => {
    it('should create an agent successfully', async () => {
      // Test
    });
  });
});
```

**Priority Tests**:
1. Auth service (login, register)
2. Agent service (create, update)
3. Form service (create, query)

---

## 🔧 Phase 2: Type Safety Improvements (Week 2)

### 1. Create Types for Aggregation Results

**Create**: `src/types/aggregation.types.ts`
```typescript
export interface IFormWithDetails extends IForm {
  user?: IUser;
  createdBy?: string;
  agentDetails?: IAgent[];
  responses?: IResponse[];
}

export interface IAgentWithDetails extends IAgent {
  user?: IUser;
  forms?: IForm[];
  responses?: IResponse[];
}
```

### 2. Replace `any` Types

**Target**: Reduce from 49 to < 10 instances

**Strategy**:
- Define interfaces for all aggregation results
- Use type guards instead of `as any`
- Create proper types for complex objects

---

## 🧪 Phase 3: Testing (Week 3-4)

### 1. Unit Tests
- Services (auth, agent, form, response)
- Utilities (JWT, password, CSV)
- Models (methods)

### 2. Integration Tests
- API endpoints
- Authentication flow
- Agent creation flow
- Form operations

### 3. Test Coverage
- Target: >80% coverage
- Use `npm run test:coverage`

---

## 📝 Implementation Checklist

### Immediate (This Week)
- [ ] Replace console.log with logger (all files)
- [ ] Add validation schemas for agent endpoints
- [ ] Add validation schemas for form endpoints
- [ ] Write 3-5 critical unit tests

### Short Term (This Month)
- [ ] Create aggregation result types
- [ ] Reduce `any` types by 50%
- [ ] Add transaction handling for agent creation
- [ ] Add request ID middleware
- [ ] Write integration tests for main flows

### Long Term (Next Quarter)
- [ ] Complete test coverage (>80%)
- [ ] Add API versioning
- [ ] Performance optimization
- [ ] Add monitoring/metrics

---

## 🎯 Success Metrics

- **Logging**: 0 console.log/error (all use logger)
- **Type Safety**: < 10 `any` types
- **Test Coverage**: > 80%
- **Validation**: 100% endpoint coverage
- **Code Quality**: ESLint warnings < 5

---

**Start with Phase 1 - Logger implementation is ready to use!**
