# Farmer Implementation Summary

## ✅ Implementation Complete

The farmer system has been fully implemented with comprehensive support for all field variations in the production database.

## 📁 Files Created

### 1. **Interface** (`src/interfaces/farmer.interface.ts`)
- `IFarmer` - Farmer document interface matching `farmers` collection
  - Includes ALL field variations (age/Age, phone/phoneNumber/phone_number, etc.)
  - Required fields based on schema reference
  - Optional fields with all variations
  - References to agents, retailers, and responses
- `IFarmerCreateInput` - Input for creating farmers
- `IFarmerUpdateInput` - Flexible update input
- `IFarmerWithDetails` - Farmer with populated data

### 2. **Model** (`src/models/farmer.model.ts`)
- Mongoose schema for `farmers` collection
- **Required fields**: `farmerId`, `name`, `locationName`, `photo`, `farmingCrop`, `harvestPurpose`, `harvestSize`, `identification`, `smartphone`, `organicFarmingInterest`, `noOfChildren`, `noOfSpouse`, `availableBalance`, `riskScore`, `pre_retailer`, `requests`, `repayments`
- **Optional fields**: All variations (age/Age, phone/phoneNumber, farmSize/FarmSize, etc.)
- Uses `Schema.Types.Mixed` for fields that can have varying types
- Uses `strict: false` to allow fields not explicitly defined (due to many variations)
- Indexes on `farmerId`, `agent_user_id`, `retailer_id`, `OriginalResponseId`, `createdAt`, `phone`, `phoneNumber`

### 3. **Service** (`src/services/farmer.service.ts`)
- `getAllFarmers()` - Get all farmers (with optional aggregation for populated details)
- `getFarmerById()` - Get farmer by ID (with optional populated details)
- `getFarmersByAgentUserId()` - Get farmers by agent user ID
- `getFarmersByRetailerId()` - Get farmers by retailer ID
- `createFarmer()` - Create new farmer
- `updateFarmerById()` - Update farmer
- `deleteFarmerById()` - Delete farmer
- `getBaseFarmerPipeline()` - Aggregation pipeline for populated data (agent, retailer, response)

### 4. **Controller** (`src/controllers/farmer.controller.ts`)
- `getAllFarmers()` - Get all farmers endpoint
- `getFarmer()` - Get single farmer by ID
- `getFarmersByAgent()` - Get farmers by agent user ID
- `getFarmersByRetailer()` - Get farmers by retailer ID

### 5. **Routes** (`src/routes/farmer.routes.ts`)
- `GET /api/farmers/all` - Get all farmers (legacy endpoint, matches old backend)
- `GET /api/farmers` - Get all farmers (RESTful endpoint)
- `GET /api/farmers/:id` - Get farmer by ID
- `GET /api/farmers/agent/:agentUserId` - Get farmers by agent
- `GET /api/farmers/retailer/:retailerId` - Get farmers by retailer

## 🔐 Authorization

All farmer endpoints require authentication (`authenticate` middleware).

## 🔍 Key Features

### 1. **Field Variations Support**
The farmer schema has many field variations in the production database:
- **Age**: `age` (string|number) and `Age` (string)
- **Phone**: `phone`, `phoneNumber`, `phone_number`
- **Farm Size**: `farmSize`, `FarmSize`, `farm_size`, `farmsize`
- **Family**: `family`, `family_size`, `familySize`, `familysize`
- And many more...

All variations are supported in the model using `Schema.Types.Mixed` and `strict: false`.

### 2. **Aggregation Pipeline**
The service includes an aggregation pipeline that:
- Looks up agent from `userdbs` collection
- Looks up retailer from `retailers` collection
- Looks up original response from `responsesdbs` collection
- Removes sensitive fields (passwords) from agent data
- Preserves null/empty arrays for optional relationships

### 3. **Optional Details**
All endpoints support an optional `?details=true` query parameter to include populated data:
- Agent information
- Retailer information
- Original response information

### 4. **Backward Compatibility**
- Maintains `/api/farmers/all` endpoint to match old backend
- Also provides RESTful `/api/farmers` endpoint

## 📊 Database Schema Compliance

✅ **Collection Name**: `farmers` (exact match)  
✅ **Field Names**: All variations preserved (age/Age, phone/phoneNumber, etc.)  
✅ **Relationships**: 
- `agent_user_id` → `userdbs` (ObjectId reference)
- `retailer_id` → `retailers` (ObjectId reference)
- `OriginalResponseId` → `responsesdbs` (ObjectId reference)
✅ **Timestamps**: `createdAt`, `updatedAt` (automatic)  
✅ **Flexible Schema**: `strict: false` to accommodate all field variations

## 🎯 Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|--------------|
| `/api/farmers/all` | GET | Get all farmers (legacy) | Yes |
| `/api/farmers` | GET | Get all farmers | Yes |
| `/api/farmers/:id` | GET | Get farmer by ID | Yes |
| `/api/farmers/agent/:agentUserId` | GET | Get farmers by agent | Yes |
| `/api/farmers/retailer/:retailerId` | GET | Get farmers by retailer | Yes |

## 🔄 Updated Files

1. **`src/app.ts`** - Registered farmer routes

## ⚠️ Important Notes

1. **Schema Flexibility**: The farmer model uses `strict: false` to allow fields not explicitly defined in the schema. This is necessary due to the many field variations in the production database.

2. **Type Safety**: Some fields use `Schema.Types.Mixed` to accommodate varying types (e.g., `age` can be string or number, `riskScore` can be number or string).

3. **Required Fields**: The required fields are based on the schema reference, but in practice, many may be optional. The model enforces required fields at the TypeScript level, but MongoDB will accept documents with missing required fields if they're not explicitly validated.

4. **Arrays**: The `requests` and `repayments` arrays use `Schema.Types.Mixed` to allow flexible object structures.

## ✅ Testing Checklist

- [ ] Get all farmers
- [ ] Get all farmers with details (?details=true)
- [ ] Get farmer by ID
- [ ] Get farmers by agent user ID
- [ ] Get farmers by retailer ID
- [ ] Verify backward compatibility with `/api/farmers/all`

## 📝 Next Steps

1. Add validation schemas for farmer endpoints (if needed)
2. Add unit tests for farmer service
3. Add integration tests for farmer routes
4. Consider adding farmer statistics/analytics
5. Add farmer creation/update endpoints if needed

---

**Status**: ✅ Complete | All farmer endpoints implemented with comprehensive field support
