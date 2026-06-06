# Swagger Documentation Setup

## ✅ Setup Complete

Swagger/OpenAPI documentation has been successfully set up for the UFarmX Unified Backend API.

## 📍 Access Points

### Swagger UI (Interactive Documentation)
- **URL**: `http://localhost:8000/api-docs`
- **Description**: Interactive API documentation with "Try it out" functionality
- **Features**:
  - Browse all endpoints
  - View request/response schemas
  - Test endpoints directly
  - Authenticate with JWT tokens

### OpenAPI JSON Specification
- **URL**: `http://localhost:8000/api-docs.json`
- **Description**: Machine-readable OpenAPI 3.0 specification
- **Use Cases**:
  - Import into API testing tools (Postman, Insomnia)
  - Generate client SDKs
  - API contract validation

## 📁 Files Created/Modified

### New Files

1. **`src/config/swagger.ts`**
   - Swagger configuration
   - OpenAPI 3.0 specification
   - Schema definitions
   - Server configurations

2. **`API_DOCUMENTATION.md`**
   - Complete API documentation guide
   - Authentication instructions
   - Usage examples
   - Error handling guide

3. **`README.md`**
   - Project overview
   - Quick start guide
   - Development instructions
   - Links to documentation

4. **`SWAGGER_SETUP.md`** (this file)
   - Setup summary
   - Configuration details

### Modified Files

1. **`src/app.ts`**
   - Added Swagger UI middleware
   - Added OpenAPI JSON endpoint
   - Updated Helmet configuration for Swagger UI compatibility
   - Added health check endpoint documentation

2. **`src/routes/auth.routes.ts`**
   - Added comprehensive Swagger JSDoc comments
   - Documented all authentication endpoints
   - Added request/response examples
   - Added security requirements

## 🔧 Configuration Details

### Swagger Configuration

- **OpenAPI Version**: 3.0.0
- **API Title**: UFarmX Unified Backend API
- **API Version**: 1.0.0
- **Servers**:
  - Development: `http://localhost:8000/api`
  - Production: `https://api.ufarmx.com/api`

### Security Scheme

- **Type**: HTTP Bearer Authentication
- **Scheme**: bearer
- **Format**: JWT
- **Usage**: Add `Bearer <token>` in Authorization header

### Documented Endpoints

#### Authentication Endpoints
- ✅ `POST /api/auth/register` - Register new user
- ✅ `POST /api/auth/login` - Login user
- ✅ `POST /api/auth/refresh` - Refresh access token
- ✅ `GET /api/auth/me` - Get current user (protected)
- ✅ `POST /api/auth/logout` - Logout user (protected)

#### Health Check
- ✅ `GET /health` - Health check endpoint

## 📝 Documentation Features

### Schema Definitions

The following schemas are defined in Swagger:

- `User` - User model
- `Tokens` - JWT tokens response
- `RegisterRequest` - User registration request
- `LoginRequest` - User login request
- `RefreshTokenRequest` - Token refresh request
- `Error` - Error response format
- `Success` - Success response format

### Tags

Endpoints are organized by tags:

- **Authentication** - All auth-related endpoints
- **Health** - System health and status endpoints

## 🚀 Usage

### Starting the Server

```bash
npm run dev
```

### Accessing Swagger UI

1. Open browser: `http://localhost:8000/api-docs`
2. Explore endpoints by expanding sections
3. Click "Try it out" to test endpoints
4. Use "Authorize" button to add JWT token

### Testing Authentication Flow

1. **Register a user**:
   - Go to `POST /api/auth/register`
   - Click "Try it out"
   - Fill in the request body
   - Click "Execute"
   - Copy the `accessToken` from response

2. **Authorize in Swagger**:
   - Click "Authorize" button (top right)
   - Enter: `Bearer <your-access-token>`
   - Click "Authorize" then "Close"

3. **Test protected endpoint**:
   - Go to `GET /api/auth/me`
   - Click "Try it out"
   - Click "Execute"
   - View your user profile

## 🔒 Security Configuration

### Helmet Configuration

Helmet has been configured to allow Swagger UI to function:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
})
```

This allows:
- Inline styles (required by Swagger UI)
- Inline scripts (required by Swagger UI)
- External images (for Swagger UI assets)

## 📚 Adding Documentation to New Endpoints

### Step 1: Add JSDoc Comments to Route

```typescript
/**
 * @swagger
 * /api/my-endpoint:
 *   get:
 *     summary: Get my data
 *     description: Returns user's data
 *     tags: [MyTag]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/my-endpoint', authenticate, myController);
```

### Step 2: Add Schema Definitions (if needed)

In `src/config/swagger.ts`, add to `components.schemas`:

```typescript
components: {
  schemas: {
    MyModel: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}
```

### Step 3: Rebuild and Test

```bash
npm run build
npm run dev
```

Visit `http://localhost:8000/api-docs` to see your new endpoint.

## ✅ Verification Checklist

- [x] Swagger UI accessible at `/api-docs`
- [x] OpenAPI JSON accessible at `/api-docs.json`
- [x] All authentication endpoints documented
- [x] Health check endpoint documented
- [x] Authentication flow works in Swagger UI
- [x] Schema definitions included
- [x] Request/response examples provided
- [x] Security scheme configured
- [x] Helmet configured for Swagger UI
- [x] Documentation files created

## 🎯 Next Steps

1. **Add more endpoints**: Document remaining endpoints as they're implemented
2. **Add more schemas**: Define schemas for all data models
3. **Add examples**: Add more request/response examples
4. **Add descriptions**: Enhance endpoint descriptions
5. **Add tags**: Organize endpoints with appropriate tags

## 📖 Related Documentation

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Complete API guide
- [README.md](./README.md) - Project overview
- [UNIFIED_BACKEND_PLAN.md](../../UNIFIED_BACKEND_PLAN.md) - Implementation plan

---

**Setup Date**: January 2026
**Status**: ✅ Complete and Ready to Use
