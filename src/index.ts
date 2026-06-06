import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { backgroundJobService } from './services/background-job.service.js';

/**
 * Server Entry Point
 */

const PORT = process.env.PORT || 8000;
console.log('WE ARE STILL GOOD AT THIS POINT')

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...')
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: error.message,
    name: error.name,
    stack: error.stack,
  });
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize background jobs
    backgroundJobService.initializeBackgroundJobs();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('Server started successfully')
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        healthCheck: `http://localhost:${PORT}/health`,
        authAPI: `http://localhost:${PORT}/api/auth`,
        swaggerDocs: `http://localhost:${PORT}/api-docs`,
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error: Error) => {
      console.log('UNHANDLED REJECTION! Shutting down...')
      logger.error('UNHANDLED REJECTION! Shutting down...', {
        error: error.message,
        name: error.name,
        stack: error.stack,
      });
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      backgroundJobService.shutdownBackgroundJobs();
      server.close(() => {
        console.log('Process terminated');
        logger.info('Process terminated');
      });
    });
  } catch (error: any) {
    console.log('Failed to start server');
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the server
startServer();
