# UFarmX Unified Backend API Documentation

## Overview

The UFarmX Unified Backend API is a modern TypeScript-based REST API that serves all UFarmX client applications. It provides a single, unified backend to replace the previous separate backends while maintaining full backward compatibility with existing data and applications.

## Quick Start

### Access Swagger UI

Once the server is running, access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8000/api-docs`
- **OpenAPI JSON**: `http://localhost:8000/api-docs.json`

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on port 8000 (or the port specified in your `.env` file).

## API Documentation

### Swagger UI

The Swagger UI provides an interactive interface to explore and test all API endpoints. It includes:

- **Complete endpoint documentation** with request/response schemas
- **Try it out** functionality to test endpoints directly
- **Authentication support** with Bearer token input
- **Schema definitions** for all data models

### Accessing Swagger UI

1. Start the development server: `npm run dev`
2. Open your browser and navigate to: `http://localhost:8000/api-docs`
3. Explore endpoints by expanding the sections
4. Use the "Try it out" button to test endpoints

### Using Authentication in Swagger

1. First, register or login using the `/api/auth/register` or `/api/auth/login` endpoints
2. Copy the `accessToken` from the response
3. Click the "Authorize" button at the top of the Swagger UI
4. Enter: `Bearer <your-access-token>` (include the word "Bearer" and a space)
5. Click "Authorize" and then "Close"
6. Now all protected endpoints will use your token automatically

## API Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `https://api.ufarmx.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Most endpoints require authentication.

### Getting Started with Authentication

1. **Register a new user**:
   ```bash
   POST /api/auth/register
   {
     "email": "user@example.com",
     "passWord": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe",
     "phone": "1234567890",
     "role": "agent"
   }
   ```

2. **Login**:
   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "SecurePass123!"
   }
   ```

3. **Use the access token** in subsequent requests:
   ```bash
   Authorization: Bearer <your-access-token>
   ```

### Token Types

- **Access Token**: Short-lived token (default: 7 days) for API requests
- **Refresh Token**: Long-lived token (default: 30 days) to get new access tokens

### Refreshing Tokens

When your access token expires, use the refresh token to get a new one:

```bash
POST /api/auth/refresh
{
  "refreshToken": "<your-refresh-token>"
}
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 requests per window per IP address
- **Scope**: All `/api/*` endpoints

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

## Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |

## Database Schema Preservation

⚠️ **IMPORTANT**: This API preserves the exact database schema from production. This means:

- Field names match exactly (e.g., `passWord` with capital W, `is_active` with underscore)
- Data types are preserved (some fields can be `boolean` OR `string`)
- Collection names match exactly (`userdbs`, `admindbs`, `agentdbs`, etc.)
- No database migration is required

### Common Field Naming

- `passWord` - Password field (capital W)
- `is_active` - Active status (snake_case, can be boolean or string)
- `is_deleted` - Deleted flag (snake_case)
- `user_id` - User reference (snake_case)
- `createdAt` - Timestamp (camelCase)
- `updatedAt` - Timestamp (camelCase)

## Error Handling

The API uses consistent error handling:

1. **Validation Errors**: Returned when request data doesn't match the schema
2. **Authentication Errors**: Returned when token is missing or invalid
3. **Authorization Errors**: Returned when user doesn't have permission
4. **Not Found Errors**: Returned when resource doesn't exist
5. **Conflict Errors**: Returned when resource already exists

All errors include a descriptive message and error details.

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Protection against abuse
- **NoSQL Injection Prevention**: Data sanitization
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 10 salt rounds
- **Input Validation**: Joi schema validation

## Development

### Project Structure

```
src/
├── config/          # Configuration files (database, env, swagger)
├── controllers/     # Route handlers
├── interfaces/      # TypeScript interfaces
├── middlewares/     # Express middlewares
├── models/          # Mongoose models
├── routes/          # Express routes
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Create route in `src/routes/`
3. Add Swagger documentation using JSDoc comments
4. Register route in `src/app.ts`

### Swagger Documentation Format

Use JSDoc comments with Swagger annotations:

```typescript
/**
 * @swagger
 * /endpoint:
 *   get:
 *     summary: Endpoint description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success response
 */
```

## Testing

### Using Swagger UI

1. Navigate to `http://localhost:8000/api-docs`
2. Expand the endpoint you want to test
3. Click "Try it out"
4. Fill in the request parameters
5. Click "Execute"
6. View the response

### Using cURL

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "passWord": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "agent"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get current user (with token)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <your-access-token>"
```

## Environment Variables

Required environment variables (see `.env.example`):

```env
NODE_ENV=development
PORT=8000
MONGO_URI=mongodb://localhost:27017/ufarmx
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:3000
```

## Support

For issues, questions, or contributions:

- **Email**: support@ufarmx.com
- **Documentation**: See Swagger UI at `/api-docs`
- **OpenAPI Spec**: Available at `/api-docs.json`

## License

MIT License - See LICENSE file for details
