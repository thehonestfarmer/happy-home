/**
 * Job Types for the Scraper Queue
 * 
 * Defines the different types of jobs that can be processed by the queue.
 */

// Common job data properties
export interface BaseJobData {
  id: string;
  timestamp?: string;
  retryCount?: number;
}

// Job for scraping a listing page
export interface ListingJobData extends BaseJobData {
  url: string;
  type: 'listing';
}

// Job for scraping a detail page
export interface DetailJobData extends BaseJobData {
  url: string;
  type: 'detail';
  listingId: string;
  metadata?: Record<string, any>;
}

// Failed job data for retry
export interface FailedJobData extends BaseJobData {
  url: string;
  type: 'listing' | 'detail';
  reason: string;
  fromFailedJobs: true;
  extractors: string[];
}

// Union type of all job data types
export type ScraperJobData = 
  | ListingJobData 
  | DetailJobData 
  | FailedJobData;

// Job names for the queue
export enum JobName {
  SCRAPE_LISTING = 'scrape-listing',
  PROCESS_DETAIL = 'process-detail',
  RETRY_FAILED = 'retry-failed'
}

// Job options
export interface JobOptions {
  priority?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
} 