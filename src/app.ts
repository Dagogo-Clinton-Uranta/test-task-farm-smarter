import express, {
  Application,
  Request,
  Response
} from 'express';
import cors from 'cors';
//import helmet from 'helmet';
//const helmet = require('helmet');

import mongoSanitize from 'express-mongo-sanitize';
//import rateLimit from 'express-rate-limit'; //vercel deployment issues made me do this
//const rateLimit = require('express-rate-limit');
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { swaggerSpec } from './config/swagger.js';
import authRoutes from './routes/auth.routes.js';
import formRoutes from './routes/form.routes.js';
import agentRoutes from './routes/agent.routes.js';
import adminRoutes from './routes/admin.routes.js';
import controlsRoutes from './routes/controls.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import userRoutes from './routes/user.routes.js';
import responseRoutes from './routes/response.routes.js';
import retailerRoutes from './routes/retailer.routes.js';
import requestRoutes from './routes/request.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import formConfigRoutes from './routes/form-config.routes.js';
import formDataExtractionRoutes from './routes/form-data-extraction.routes.js';
import documentRoutes from './routes/document.routes.js';
import creditScoreRoutes from './routes/credit-score.routes.js';
import loanRoutes from './routes/loan.routes.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { backgroundJobService } from './services/background-job.service.js';

/**
 * Express Application Setup
 */

const PORT = process.env.PORT || 8000;

const app: Application = express();

// Security Middleware
//app.use(
//  helmet({
//    contentSecurityPolicy: {
//      directives: {
//        defaultSrc: ["'self'"],
//        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI.
//        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger UI
//        imgSrc: ["'self'", 'data:', 'https:'],
//      },
//    },
//  })
//); // Set security headers
app.use(
  cors({
    origin: '*',
    credentials: false,
  })
);

// Rate limiting
//const limiter = rateLimit({
//  windowMs: env.RATE_LIMIT_WINDOW_MS,
//  max: env.RATE_LIMIT_MAX_REQUESTS,
//  message: 'Too many requests from this IP, please try again later',
//  standardHeaders: true,
//  legacyHeaders: false,
//});
//app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Compression middleware
app.use(compression());

// Logging middleware (development only)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}





/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: UFarmX API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get(
  '/health',
  (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'UFarmX API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UFarmX API Documentation',
  customfavIcon: '/favicon.ico',
}));

// Swagger JSON endpoint
app.get(
  '/api-docs.json',
  (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/controls', controlsRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/form-config', formConfigRoutes);
app.use('/api/form-extraction', formDataExtractionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/credit-scores', creditScoreRoutes);
app.use('/api/loans', loanRoutes);

// 404 Handler (must be after all routes)
app.use(notFoundHandler);

// Global Error Handler (must be last)
app.use(errorHandler);

connectDatabase();
// Start server
//const startServer = async () => {
//  try {
//    // Connect to database
//    await connectDatabase();
//
//  
//    // Start Express server
//    const server = app.listen(PORT, () => {
//      console.log('Server started successfully')
//      logger.info('Server started successfully', {
//        port: PORT,
//        environment: process.env.NODE_ENV,
//        healthCheck: `http://localhost:${PORT}/health`,
//        authAPI: `http://localhost:${PORT}/api/auth`,
//        swaggerDocs: `http://localhost:${PORT}/api-docs`,
//      });
//    });
//
//    // Handle unhandled promise rejections
//    process.on('unhandledRejection', (error: Error) => {
//      console.log('UNHANDLED REJECTION! Shutting down...')
//      logger.error('UNHANDLED REJECTION! Shutting down...', {
//        error: error.message,
//        name: error.name,
//        stack: error.stack,
//      });
//      server.close(() => {
//        process.exit(1);
//      });
//    });
//
//    // Handle SIGTERM
//    process.on('SIGTERM', () => {
//      logger.info('SIGTERM received. Shutting down gracefully...');
//      backgroundJobService.shutdownBackgroundJobs();
//      server.close(() => {
//        console.log('Process terminated');
//        logger.info('Process terminated');
//      });
//    });
//  } catch (error: any) {
//    console.log('Failed to start server');
//    logger.error('Failed to start server', {
//      error: error.message,
//      stack: error.stack,
//    });
//    process.exit(1);
//  }
//};

// Start the server
//startServer();



export default app;
