# UFarmX Unified Backend API

Modern TypeScript-based unified backend API for the UFarmX agricultural technology platform.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Required: MONGO_URI, JWT_SECRET
```

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server will start on `http://localhost:8000` (or your configured PORT).

## 📚 API Documentation

### Swagger UI

Access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8000/api-docs`
- **OpenAPI JSON**: `http://localhost:8000/api-docs.json`

The Swagger UI provides:
- Complete endpoint documentation
- Interactive testing ("Try it out" feature)
- Request/response schemas
- Authentication support

### Using Swagger UI

1. Start the server: `npm run dev`
2. Open `http://localhost:8000/api-docs` in your browser
3. Explore endpoints by expanding sections
4. Click "Try it out" to test endpoints
5. Use "Authorize" button to add your JWT token

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Quick Example

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "passWord": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "agent"
  }'

# 2. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# 3. Use the access token
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <your-access-token>"
```

## 📁 Project Structure

```
ufarmx-apis/
├── src/
│   ├── config/          # Configuration (database, env, swagger)
│   ├── controllers/     # Route handlers
│   ├── interfaces/      # TypeScript interfaces
│   ├── middlewares/     # Express middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── dist/                # Compiled JavaScript (generated)
├── .env                 # Environment variables (create from .env.example)
├── package.json
├── tsconfig.json
├── README.md
└── API_DOCUMENTATION.md
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Adding New Endpoints

1. **Create Controller** (`src/controllers/`)
   ```typescript
   export const myController = async (req, res, next) => {
     // Controller logic
   };
   ```

2. **Create Route** (`src/routes/`)
   ```typescript
   /**
    * @swagger
    * /endpoint:
    *   get:
    *     summary: Description
    *     tags: [TagName]
    */
   router.get('/endpoint', authenticate, myController);
   ```

3. **Register Route** (`src/app.ts`)
   ```typescript
   import myRoutes from './routes/my.routes.js';
   app.use('/api/my', myRoutes);
   ```

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ NoSQL injection prevention
- ✅ Input validation (Joi)
- ✅ XSS protection

## 📊 Database Schema

⚠️ **IMPORTANT**: This API preserves the exact database schema from production.

- Field names match exactly (`passWord`, `is_active`, `user_id`)
- Collection names match exactly (`userdbs`, `admindbs`, `agentdbs`)
- No database migration required
- Full backward compatibility

See [DATABASE_SCHEMA_REFERENCE.md](../../DATABASE_SCHEMA_REFERENCE.md) for details.

## 🌐 Environment Variables

Create a `.env` file with:

```env
# Server
NODE_ENV=development
PORT=8000

# Database
MONGO_URI=mongodb://localhost:27017/ufarmx

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AWS (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_REGION=
AWS_S3_BUCKET=
AWS_SES_REGION=
AWS_SES_FROM_EMAIL=

# OpenAI (Optional)
OPENAI_API_KEY=
```

## 📝 API Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
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

## 🧪 Testing

### Using Swagger UI

1. Navigate to `http://localhost:8000/api-docs`
2. Expand an endpoint
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"
6. View response

### Health Check

```bash
curl http://localhost:8000/health
```

## 📖 Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API documentation
- **[Swagger UI](http://localhost:8000/api-docs)** - Interactive API explorer
- **[UNIFIED_BACKEND_PLAN.md](../../UNIFIED_BACKEND_PLAN.md)** - Implementation plan
- **[DATABASE_SCHEMA_REFERENCE.md](../../DATABASE_SCHEMA_REFERENCE.md)** - Database schema reference

## 🚧 Current Status

### ✅ Completed

- Project setup and infrastructure
- Authentication system (register, login, JWT)
- Database connection
- Security middleware
- Error handling
- Swagger documentation

### 🚧 In Progress

- User management (Admin, Agent, Retailer)
- Farmer management
- Product management
- Order management
- Form system
- AI integration

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Preserve database schema exactly
3. Add Swagger documentation for new endpoints
4. Write tests for new features
5. Follow existing code patterns

## 📄 License

MIT License

## 🆘 Support

- **Email**: support@ufarmx.com
- **Documentation**: See Swagger UI at `/api-docs`
- **Issues**: Create an issue in the repository

---

**Built with ❤️ for UFarmX**
