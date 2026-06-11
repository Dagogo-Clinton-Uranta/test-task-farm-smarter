import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { logger } from '../utils/logger.js';
import { env } from './env.js';
import { Farm } from '../entities/farm.entity.js';
import { FarmReading } from '../entities/farm-reading.entity.js';
import { CreateFarmTables20260610000000 } from '../migrations/20260610000000-create-farm-tables.js';


export const appDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [Farm, FarmReading],
  migrations: [CreateFarmTables20260610000000],

});
//for my type ORM setup,, I choose to log only errors in production.

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!appDataSource.isInitialized) {
      await appDataSource.initialize();
    }

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
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
  }
};
