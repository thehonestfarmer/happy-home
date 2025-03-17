/**
 * Worker Implementation
 * 
 * Processes jobs from the queue with a functional programming approach.
 */

import { Job } from 'bull';
import { Browser } from 'puppeteer';

import { scraperQueue } from './index';
import { ScraperJobData, JobName } from './job-types';
import { initBrowser, closeBrowser } from '../utils/browser';
import { createContextLogger } from '../utils/logger';

// Create a worker-specific logger
const logger = createContextLogger('Worker');

// Browser instance shared between jobs
let browser: Browser | null = null;

/**
 * Get concurrency settings from environment variables
 */
const getConcurrencySettings = () => {
  return {
    listingConcurrency: parseInt(process.env.LISTING_CONCURRENCY || '1', 10),
    detailConcurrency: parseInt(process.env.DETAIL_CONCURRENCY || '3', 10),
    retryLimit: parseInt(process.env.RETRY_LIMIT || '3', 10),
  };
};

/**
 * Initialize the browser if not already initialized
 */
const ensureBrowser = async (): Promise<Browser> => {
  if (!browser) {
    logger.info('Initializing browser');
    const result = await initBrowser()();
    if (result._tag === 'Left') {
      throw result.left;
    }
    browser = result.right;
    logger.success('Browser initialized');
  }
  return browser;
};

/**
 * Initialize the worker
 */
export const initializeWorker = () => {
  if (!scraperQueue) {
    logger.error('Failed to initialize worker: Queue not available');
    return;
  }

  // Get concurrency settings
  const { listingConcurrency, detailConcurrency, retryLimit } = getConcurrencySettings();
  
  logger.info(`Configuring worker with concurrency settings: listings=${listingConcurrency}, details=${detailConcurrency}, retryLimit=${retryLimit}`);

  // Process listing jobs with configured concurrency
  scraperQueue.process(JobName.SCRAPE_LISTING, listingConcurrency, async (job) => {
    logger.info(`Processing listing job ${job.id}`);
    await ensureBrowser();
    // Job processing logic to be implemented
  });

  // Process detail page jobs with configured concurrency
  scraperQueue.process(JobName.PROCESS_DETAIL, detailConcurrency, async (job) => {
    logger.info(`Processing detail job ${job.id}`);
    await ensureBrowser();
    // Job processing logic to be implemented
  });

  // Process retry jobs (using listing concurrency as default)
  scraperQueue.process(JobName.RETRY_FAILED, listingConcurrency, async (job) => {
    logger.info(`Processing retry job ${job.id}`);
    await ensureBrowser();
    // Job processing logic to be implemented
  });

  // Clean up when the process exits
  const cleanup = async () => {
    if (browser) {
      logger.info('Closing browser');
      await closeBrowser(browser)();
      browser = null;
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  logger.success('Worker initialized and ready to process jobs');
};

// Auto-initialize if this file is run directly
if (require.main === module) {
  initializeWorker();
} 