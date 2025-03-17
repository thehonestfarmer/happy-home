/**
 * Admin Triggers
 * 
 * Functions for triggering scraper operations and getting status information.
 */

import { scraperQueue, addJob } from '../queue';
import { JobName, ListingJobData } from '../queue/job-types';
import { createContextLogger } from '../utils/logger';
import { getFailedJobs, clearFailedJobs, removeFailedJob } from './jobs';

// Create a context-specific logger
const logger = createContextLogger('Admin:Triggers');

/**
 * Start a new scrape operation
 * 
 * @param targetUrl Optional specific URL to scrape, otherwise uses default configuration
 * @returns Object with job ID and status
 */
export const startNewScrape = async (targetUrl?: string): Promise<{ jobId: string, status: string }> => {
  try {
    const url = targetUrl || 'https://www.shiawasehome-reuse.com/?bukken=jsearch&shub=1&kalb=0&kahb=kp120&tochimel=0&tochimeh=&mel=0&meh='; // Default URL
    logger.info(`Starting new scrape for ${url}`);
    
    const jobData: ListingJobData = {
      id: `listing-${Date.now()}`, // Generate unique ID
      url: url,
      type: 'listing',
      timestamp: new Date().toISOString(),
    };
    
    const job = await addJob(JobName.SCRAPE_LISTING, jobData, {
      priority: 1, // High priority
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 seconds initial delay
      },
    });
    
    logger.success(`New scrape job created with ID: ${job.id}`);
    return {
      jobId: job.id.toString(),
      status: 'queued',
    };
  } catch (error) {
    logger.error('Failed to start new scrape', error);
    throw error;
  }
};

/**
 * Retry failed jobs
 * 
 * @param jobIds Optional specific job IDs to retry, otherwise retries all failed jobs
 * @returns Array of job IDs that were queued for retry
 */
export const retryFailedJobs = async (jobIds?: string[]): Promise<string[]> => {
  try {
    const failedJobs = await getFailedJobs();
    const jobsToRetry = jobIds 
      ? failedJobs.filter(job => jobIds.includes(job.id.toString()))
      : failedJobs;
    
    logger.info(`Retrying ${jobsToRetry.length} failed jobs`);
    
    const retryPromises = jobsToRetry.map(async (failedJob) => {
      // Create retry job data with properly typed data
      const jobData = {
        id: `retry-${failedJob.id}-${Date.now()}`,
        url: failedJob.data.url,
        type: 'listing' as const, // Explicitly set as 'listing' type
        timestamp: new Date().toISOString(),
        retryCount: (failedJob.data.retryCount || 0) + 1,
        fromFailedJobs: true as const,
        reason: 'manual_retry',
        extractors: [],
        originalJobId: failedJob.id.toString(),
      };
      
      const job = await addJob(
        JobName.RETRY_FAILED,
        jobData,
        {
          priority: 2, // Medium priority
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 10000, // 10 seconds initial delay
          },
        }
      );
      
      // Remove from failed jobs list after successful retry queue
      await removeFailedJob(failedJob.id.toString());
      
      return job.id.toString();
    });
    
    const retriedJobIds = await Promise.all(retryPromises);
    
    logger.success(`Successfully queued ${retriedJobIds.length} jobs for retry`);
    return retriedJobIds;
  } catch (error) {
    logger.error('Failed to retry jobs', error);
    throw error;
  }
};

/**
 * Get the current status of the scraper system
 * 
 * @returns Object containing status information about queues, jobs, etc.
 */
export const getScraperStatus = async (): Promise<{
  activeJobs: number;
  waitingJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastRun: string | null;
  queueStatus: 'active' | 'paused' | 'closed';
}> => {
  try {
    if (!scraperQueue) {
      throw new Error('Queue not initialized');
    }
    
    const [
      activeCount,
      waitingCount,
      completedCount,
      failedJobsArray,
    ] = await Promise.all([
      scraperQueue.getActiveCount(),
      scraperQueue.getWaitingCount(),
      scraperQueue.getCompletedCount(),
      getFailedJobs(),
    ]);
    
    // Get the timestamp of the most recent completed job
    const completedJobs = await scraperQueue.getCompleted(0, 1);
    const lastRun = completedJobs.length > 0 
      ? completedJobs[0].finishedOn?.toString() || null
      : null;
    
    logger.info('Retrieved scraper system status');
    
    return {
      activeJobs: activeCount,
      waitingJobs: waitingCount,
      completedJobs: completedCount,
      failedJobs: failedJobsArray.length,
      lastRun,
      queueStatus: await scraperQueue.isPaused() ? 'paused' : 'active',
    };
  } catch (error) {
    logger.error('Failed to get scraper status', error);
    throw error;
  }
}; 