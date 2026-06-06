import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 0, //changed from 5 - jun 1 2026
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000, //changed from 5000 - jun 1 2026
    };


    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, options);

    console.log('MongoDB connected successfully');

    logger.info('MongoDB connected successfully', {
      database: mongoose.connection.db?.databaseName || 'unknown',
      host: mongoose.connection.host,
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', {
        error: err.message,
        stack: err.stack,
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('Failed to connect to MongoDB', {
      error: error.message,
      stack: error.stack,
      mongoUri: env.MONGO_URI ? 'configured' : 'not configured',
    });
    process.exit(1);
  }
};
