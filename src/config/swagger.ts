import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'path';
import { env } from './env.js';

// Resolves to the directory of THIS file at runtime.
// In dev (tsx):  src/config/
// In prod (node dist/): dist/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url)); 

/**
 * Swagger Configuration
 * Generates OpenAPI 3.0 specification from JSDoc comments
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UFarmX Unified Backend API',
      version: '1.0.0',
      description: `
# UFarmX Unified Backend API Documentation

## Overview
This is the unified backend API for the UFarmX agricultural technology platform. It serves all client applications including:
- **ufarmx-admin** - Modern admin panel (React 19)
- **ufarmx-web** - Legacy admin web app (React 17)
- **RetailerMobile** - React Native retailer app
- **ufarmx-mobile-clone** - Expo agent app

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Most endpoints require authentication via Bearer token in the Authorization header.

### Getting Started
1. Register a new user: \`POST /api/auth/register\`
2. Login to get tokens: \`POST /api/auth/login\`
3. Use the access token in subsequent requests: \`Authorization: Bearer <token>\`

## Base URL
- **Development**: \`http://localhost:8000/api/v1\`
- **Production**: \`https://api.ufarmx.com/api/v1\`

## Response Format
All API responses follow a consistent format:
\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
\`\`\`

## Error Format
Errors are returned in the following format:
\`\`\`json
{
  "success": false,
  "message": "Error message",
  "error": "Error details"
}
\`\`\`

## Rate Limiting
API requests are rate-limited to prevent abuse:
- **Window**: 15 minutes
- **Max Requests**: 100 requests per window per IP

## Database Schema Preservation
⚠️ **IMPORTANT**: This API preserves the exact database schema from production. Field names like \`passWord\`, \`is_active\`, \`user_id\` are maintained exactly as they exist in the database.
      `,
      contact: {
        name: 'UFarmX API Support',
        email: 'support@ufarmx.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: 'Development server',
      },
      {
        url: 'https://api.ufarmx.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'string',
              example: 'Detailed error information',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            phone: {
              type: 'string',
              example: '1234567890',
            },
            role: {
              type: 'string',
              enum: ['admin', 'agent', 'retailer', 'farmer', 'user'],
              example: 'agent',
            },
            isAdmin: {
              type: 'boolean',
              example: false,
            },
            isRetailer: {
              type: 'boolean',
              example: false,
            },
            isMerchant: {
              type: 'boolean',
              example: false,
            },
            isTeller: {
              type: 'boolean',
              example: false,
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            is_deleted: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'passWord', 'firstName', 'lastName', 'role'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'User email address (must be unique)',
            },
            passWord: {
              type: 'string',
              minLength: 6,
              example: 'SecurePass123!',
              description: 'User password (minimum 6 characters). Note: Field name uses capital W to match database schema.',
            },
            firstName: {
              type: 'string',
              example: 'John',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              description: 'User last name',
            },
            phone: {
              type: 'string',
              example: '1234567890',
              description: 'User phone number (optional)',
            },
            role: {
              type: 'string',
              enum: ['admin', 'agent', 'retailer', 'farmer', 'user'],
              example: 'agent',
              description: 'User role',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              example: 'SecurePass123!',
              description: 'User password',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Refresh token obtained from login or register',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Health',
        description: 'Health check and system status endpoints',
      },
    ],
  },
  // __dirname is src/config/ in dev, dist/config/ in prod.
  // Both cases: go up one level to reach routes/ and controllers/.
  apis: [
    path.join(__dirname, '../routes/**/*.{ts,js}'),
    path.join(__dirname, '../controllers/**/*.{ts,js}'),
    path.join(__dirname, '../app.{ts,js}'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
