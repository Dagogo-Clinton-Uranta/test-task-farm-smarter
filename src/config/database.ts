import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient();

export const connectDatabase = async (): Promise<void> => {
  try {
    // Add your local PostgreSQL/PostGIS credentials in .env as DATABASE_URL.
    // Example:
    // DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?schema=public"
    await prisma.$connect();

    logger.info('PostgreSQL database connected successfully');
  } catch (error: any) {
    logger.error('Failed to connect to PostgreSQL database', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
