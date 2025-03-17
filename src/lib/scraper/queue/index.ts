/**
 * Queue Management
 * 
 * Sets up and configures the BullMQ queue for job processing.
 */

import Queue from 'bull';
import { logger } from '../utils/logger';
import { JobName, JobOptions, ScraperJobData } from './job-types';

// Default job options
const defaultJobOptions: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  removeOnComplete: true,
  removeOnFail: false
};

/**
 * Create a new queue instance
 */
export const createQueue = () => {
  if (typeof window === 'undefined') {
    logger.info("Creating scraper queue");
    
    try {
      // Always use local Redis configuration for development
      // In production, this should use environment variables
      const queue = new Queue<ScraperJobData>('real-estate-scraper', {
        redis: {
          port: 6379,
          host: 'localhost',
        }
      });

      // Set up queue event listeners
      queue.on('error', (error) => {
        logger.error('Queue error', error);
      });
      
      queue.on('failed', (job, error) => {
        logger.error(`Job ${job.id} failed: ${error.message}`, {
          jobId: job.id,
          data: job.data,
          attempts: job.attemptsMade
        });
      });
      
      queue.on('completed', (job) => {
        logger.success(`Job ${job.id} completed`, {
          jobId: job.id,
          data: job.data
        });
      });

      logger.success("Queue initialized with local Redis");
      return queue;
    } catch (error) {
      logger.error('Failed to create queue', error);
      return null;
    }
  }
  logger.info("Not creating queue - running in browser context");
  return null;
};

/**
 * Global queue instance
 */
export const scraperQueue = createQueue();

/**
 * Add a job to the queue
 */
export const addJob = async (
  name: JobName,
  data: ScraperJobData,
  options: Partial<JobOptions> = {}
) => {
  if (!scraperQueue) {
    throw new Error('Queue not initialized');
  }
  
  const jobOptions = { ...defaultJobOptions, ...options };
  const job = await scraperQueue.add(name, data, jobOptions);
  
  logger.info(`Added job ${name} to queue`, {
    jobId: job.id,
    data
  });
  
  return job;
};

/**
 * Get the queue status
 */
export const getQueueStatus = async () => {
  if (!scraperQueue) {
    throw new Error('Queue not initialized');
  }
  
  const [waiting, active, completed, failed] = await Promise.all([
    scraperQueue.getWaitingCount(),
    scraperQueue.getActiveCount(),
    scraperQueue.getCompletedCount(),
    scraperQueue.getFailedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed
  };
}; 