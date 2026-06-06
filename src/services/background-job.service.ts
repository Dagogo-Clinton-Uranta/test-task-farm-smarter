import * as cron from 'node-cron';
import { formDataExtractionService } from './form-data-extraction.service.js';
import { logger } from '../utils/logger.js';

/**
 * Background Job Service
 * Handles scheduled background jobs
 */

let farmerExtractionJob: cron.ScheduledTask | null = null;

/**
 * Start farmer data extraction background job
 * Runs daily at 2 AM to process any missed responses
 */
export const startFarmerExtractionJob = (): void => {
  if (farmerExtractionJob) {
    logger.warn('Farmer extraction job is already running');
    return;
  }

  // Run daily at 2:00 AM
  farmerExtractionJob = cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled farmer data extraction job');
    
    try {
      const stats = await formDataExtractionService.extractFormDataFromAllResponses();
      
      logger.info('Farmer extraction job completed', {
        processed: stats.processed,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors,
      });
    } catch (error: any) {
      logger.error('Farmer extraction job failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Lagos', // Adjust timezone as needed
  });

  logger.info('Farmer extraction background job started (runs daily at 2:00 AM)');
};

/**
 * Stop farmer data extraction background job
 */
export const stopFarmerExtractionJob = (): void => {
  if (farmerExtractionJob) {
    farmerExtractionJob.stop();
    farmerExtractionJob = null;
    logger.info('Farmer extraction background job stopped');
  }
};

/**
 * Manually trigger farmer data extraction
 * Useful for testing or manual runs
 */
export const triggerFarmerExtraction = async (): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> => {
  logger.info('Manually triggering farmer data extraction');
  return await formDataExtractionService.extractFormDataFromAllResponses();
};

/**
 * Initialize all background jobs
 */
export const initializeBackgroundJobs = (): void => {
  startFarmerExtractionJob();
  logger.info('All background jobs initialized');
};

/**
 * Shutdown all background jobs
 */
export const shutdownBackgroundJobs = (): void => {
  stopFarmerExtractionJob();
  logger.info('All background jobs shut down');
};

// Export service object
export const backgroundJobService = {
  startFarmerExtractionJob,
  stopFarmerExtractionJob,
  triggerFarmerExtraction,
  initializeBackgroundJobs,
  shutdownBackgroundJobs,
};
