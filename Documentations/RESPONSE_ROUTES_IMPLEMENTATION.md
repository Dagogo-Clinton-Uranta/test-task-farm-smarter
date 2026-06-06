# Response Routes Implementation Summary

## ✅ Implementation Complete

All response endpoints have been implemented with AI analysis support (placeholder for OpenAI integration).

## 📁 Files Created/Updated

### 1. **New Interface** (`src/interfaces/response-analysis.interface.ts`)
- `IResponseAnalysis` - Response analysis document interface
- `IResponseAnalysisCreateInput` - Input for creating analysis
- `IResponseAnalysisUpdateInput` - Input for updating analysis

### 2. **New Model** (`src/models/response-analysis.model.ts`)
- Mongoose schema for `responseanalysisdbs` collection
- Fields: `analysisObject` (chat history array), `user_id`, `response_id`
- Compound unique index on `user_id` and `response_id`

### 3. **Updated Service** (`src/services/response.service.ts`)
- `getResponseById()` - Get response with populated form and agent/admin details
- `getResponsesByAgentUserId()` - Get responses by agent user ID
- `getAllFormResponsesWithLocation()` - Get responses with GPS/location data
- `updateResponse()` - Update response object
- `getResponseAnalysis()` - Get analysis by user and response ID
- `addResponseAnalysis()` - Create new analysis
- `updateResponseAnalysis()` - Update existing analysis
- `deleteResponseAnalysis()` - Delete analysis

### 4. **Controller** (`src/controllers/response.controller.ts`)
- `createResponse()` - Create new response
- `getResponseById()` - Get response by ID
- `getAgentResponses()` - Get responses by agent ID
- `getResponsesWithLocation()` - Get responses with location (filtered for admins)
- `analyzeResponse()` - Analyze response with AI (placeholder)
- `getResponseAnalysis()` - Get analysis chat history
- `deleteResponseAnalysis()` - Delete analysis
- `updateResponseObject()` - Update response object
- `deleteResponse()` - Soft delete response

### 5. **Routes** (`src/routes/response.routes.ts`)
- `POST /api/responses` - Create response
- `GET /api/responses/:id` - Get response by ID
- `POST /api/responses/:id/analyse` - Analyze response (AI)
- `GET /api/responses/:id/analysis` - Get response analysis
- `DELETE /api/responses/:id/analysis` - Delete response analysis
- `PUT /api/responses/:id/update-response` - Update response
- `DELETE /api/responses/:id/delete-response` - Delete response
- `GET /api/responses/withLocation` - Get responses with location
- `GET /api/responses/agent/:agent_id` - Get responses by agent

## 🔐 Endpoints Implemented

### 1. **Create Response**
**Endpoint:** `POST /api/responses`

**Request:**
```json
{
  "responseObject": {
    "field1": "value1",
    "field2": "value2"
  },
  "form_id": "507f1f77bcf86cd799439011"
}
```

**Features:**
- Sets `agent_user_id` or `admin_user_id` based on user role
- Returns created response with `OriginalResponseId` in responseObject

### 2. **Get Response by ID**
**Endpoint:** `GET /api/responses/:id`

**Features:**
- Populates form details
- Includes agent/admin details (filledBy)
- Includes agent details for form

### 3. **Get Responses by Agent**
**Endpoint:** `GET /api/responses/agent/:agent_id`

**Features:**
- Gets agent by ID first
- Retrieves all responses by agent's user_id
- Populates form details

### 4. **Get Responses with Location**
**Endpoint:** `GET /api/responses/withLocation`

**Features:**
- Filters responses with GPS/location data
- Admins see only their agents' responses
- Includes filledBy (agent/admin) details

### 5. **Analyze Response (AI)**
**Endpoint:** `POST /api/responses/:id/analyse`

**Request:**
```json
{
  "newChat": false
}
```

**Features:**
- Converts response to readable format (Question/Answer pairs)
- Creates or updates analysis chat history
- **Placeholder**: Currently returns placeholder response (OpenAI integration TODO)
- Supports new chat or continuing existing chat

### 6. **Get Response Analysis**
**Endpoint:** `GET /api/responses/:id/analysis`

**Features:**
- Returns chat history (filtered to exclude system messages)
- Returns empty array if no analysis exists

### 7. **Delete Response Analysis**
**Endpoint:** `DELETE /api/responses/:id/analysis`

**Features:**
- Deletes analysis chat history
- Returns 404 if analysis doesn't exist

### 8. **Update Response**
**Endpoint:** `PUT /api/responses/:id/update-response`

**Request:**
```json
{
  "responseObject": {
    "updatedField": "newValue"
  }
}
```

**Features:**
- Updates responseObject
- Sets `last_updated_by` to current user

### 9. **Delete Response**
**Endpoint:** `DELETE /api/responses/:id/delete-response`

**Features:**
- Soft delete (sets `is_deleted: true`)
- Sets `last_updated_by` to current user

## 🔒 Authorization

All endpoints require authentication. Additional authorization:
- **Admins**: Can see only their agents' responses in `withLocation` endpoint
- **Agents**: Can see their own responses

## 🤖 AI Analysis (Placeholder)

The `analyzeResponse` endpoint currently returns a placeholder response. To implement:

1. Add OpenAI configuration to `env.ts`
2. Create `intelligence.service.ts` with OpenAI integration
3. Update `analyzeResponse` controller to use intelligence service
4. Handle chat history properly (system messages, user messages, assistant responses)

## 📊 Aggregation Pipelines

### Get Response by ID
- Looks up form from `formdbs`
- Looks up agent details from `agentdbs`
- Looks up admin details from `admindbs`
- Determines `filledBy` (agent or admin)
- Projects out intermediate fields

### Get Responses with Location
- Filters for responses with GPS fields in form
- Includes all form/agent/admin lookups
- Determines `filledBy`

## 🔄 Updated Files

1. **`src/app.ts`** - Registered response routes

## ✅ Testing Checklist

- [ ] Create response as agent
- [ ] Create response as admin
- [ ] Get response by ID
- [ ] Get responses by agent ID
- [ ] Get responses with location (as agent)
- [ ] Get responses with location (as admin - should filter)
- [ ] Analyze response (placeholder)
- [ ] Get response analysis
- [ ] Delete response analysis
- [ ] Update response object
- [ ] Delete response (soft delete)

## 📝 Notes

1. **AI Analysis**: Currently a placeholder. Needs OpenAI integration.

2. **Route Order**: Specific routes (`withLocation`, `agent/:agent_id`) come before parameterized routes (`:id`) to avoid conflicts.

3. **Agent ID vs User ID**: The `getAgentResponses` endpoint takes agent ID (from `agentdbs`), then looks up the agent's `user_id` to find responses.

4. **Soft Delete**: Response deletion sets `is_deleted: true` but preserves data.

5. **Analysis Storage**: Each user can have one analysis per response (enforced by unique index).

## 🎯 Status

**Response Routes: 9/9 endpoints implemented** ✅

- ✅ Create Response
- ✅ Get Response by ID
- ✅ Get Responses by Agent
- ✅ Get Responses with Location
- ✅ Analyze Response (AI - placeholder)
- ✅ Get Response Analysis
- ✅ Delete Response Analysis
- ✅ Update Response
- ✅ Delete Response

---

**Status**: ✅ Complete | All response endpoints implemented (AI analysis placeholder ready for OpenAI integration)
