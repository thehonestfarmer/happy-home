/**
 * Real Estate Scraper System
 * 
 * Main entry point for the scraper system.
 */

import { initializeWorker } from './queue/worker';

// Export queue functionality
export { scraperQueue, addJob, getQueueStatus } from './queue';
export { JobName } from './queue/job-types';
export { initializeWorker } from './queue/worker';

// Export admin functionality
export { startNewScrape, retryFailedJobs, getScraperStatus } from './admin/triggers';
export { getFailedJobs, addFailedJob, removeFailedJob, clearFailedJobs } from './admin/jobs';

// Export storage functionality
export { updateListing, markListingAsRemoved } from './storage/supabase';
export { saveBackupJson, getLatestBackup, saveIfChanged } from './storage/json-backup';

// Export extractors
export * from './extractors';

// Export utilities
export { initBrowser, navigateToPage, closeBrowser } from './utils/browser';
export { logger, createContextLogger } from './utils/logger';
export { 
  ScraperError, 
  ErrorType,
  createNetworkError,
  createParserError,
  createDatabaseError,
  isListingRemoved,
  handleError
} from './utils/error-handling';

/**
 * Start a worker process
 * This can be called to start a worker for job processing.
 */
export const startWorker = () => {
  initializeWorker();
}; 