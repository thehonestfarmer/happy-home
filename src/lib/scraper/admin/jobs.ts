/**
 * Admin Jobs Management
 * 
 * Functions for managing failed jobs in the scraper system.
 */

import { Job } from 'bull';
import { createClient } from '@supabase/supabase-js';
import { scraperQueue } from '../queue';
import { ScraperJobData } from '../queue/job-types';
import { createContextLogger } from '../utils/logger';

// Create a context-specific logger
const logger = createContextLogger('Admin:Jobs');

// Initialize Supabase client for storing job information
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all failed jobs
 * 
 * @returns Array of failed job objects
 */
export const getFailedJobs = async (): Promise<Job<ScraperJobData>[]> => {
  try {
    if (!scraperQueue) {
      logger.error('Queue not initialized');
      return [];
    }
    
    const failedJobs = await scraperQueue.getFailed();
    logger.info(`Retrieved ${failedJobs.length} failed jobs`);
    return failedJobs;
  } catch (error) {
    logger.error('Failed to retrieve failed jobs', error);
    return [];
  }
};

/**
 * Add a job to the failed jobs table in Supabase
 * 
 * @param job The failed job to add
 * @param errorMessage The error message that caused the failure
 * @returns The ID of the inserted record or null on failure
 */
export const addFailedJob = async (
  job: Job<ScraperJobData>,
  errorMessage: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('scrape_jobs')
      .insert({
        job_id: job.id.toString(),
        job_type: job.name,
        status: 'failed',
        target_url: job.data.targetUrl,
        listing_id: job.data.listingId || null,
        attempts: job.attemptsMade,
        error_message: errorMessage,
        started_at: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        completed_at: null,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      logger.error('Failed to add failed job to database', error);
      return null;
    }
    
    logger.success(`Added failed job ${job.id} to database with ID ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error('Error adding failed job to database', error);
    return null;
  }
};

/**
 * Remove a job from the failed jobs list
 * 
 * @param jobId The ID of the job to remove
 * @returns Boolean indicating success
 */
export const removeFailedJob = async (jobId: string): Promise<boolean> => {
  try {
    if (!scraperQueue) {
      logger.error('Queue not initialized');
      return false;
    }
    
    // Remove from queue's failed list
    await scraperQueue.removeJob(jobId);
    
    // Update status in database
    const { error } = await supabase
      .from('scrape_jobs')
      .update({ status: 'retried' })
      .eq('job_id', jobId);
    
    if (error) {
      logger.error(`Failed to update job status in database: ${error.message}`);
      return false;
    }
    
    logger.success(`Removed job ${jobId} from failed jobs list`);
    return true;
  } catch (error) {
    logger.error(`Failed to remove job ${jobId} from failed jobs list`, error);
    return false;
  }
};

/**
 * Clear all failed jobs
 * 
 * @returns Number of jobs cleared
 */
export const clearFailedJobs = async (): Promise<number> => {
  try {
    if (!scraperQueue) {
      logger.error('Queue not initialized');
      return 0;
    }
    
    const failedJobs = await getFailedJobs();
    
    // Update all failed jobs in the database
    const jobIds = failedJobs.map(job => job.id.toString());
    if (jobIds.length > 0) {
      const { error } = await supabase
        .from('scrape_jobs')
        .update({ status: 'cleared' })
        .in('job_id', jobIds);
      
      if (error) {
        logger.error('Failed to update job statuses in database', error);
      }
    }
    
    // Clear the queue's failed list
    await scraperQueue.clean(0, 'failed');
    
    logger.success(`Cleared ${failedJobs.length} failed jobs`);
    return failedJobs.length;
  } catch (error) {
    logger.error('Failed to clear failed jobs', error);
    return 0;
  }
}; 