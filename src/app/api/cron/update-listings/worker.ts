import { scrapingQueue } from '@/lib/queue';
import { Browser, Page } from 'puppeteer';
import { 
  initBrowser, 
  navigateToPage, 
  extractAndTranslateTags, 
  extractLatLongAsString,
  checkIfListingExists,
  removeListingFromDatabase,
  updateListingData,
  type Extractor,
  type ExtractedData,
  extractDescription
} from './process-updated-listings';
import { removeFailedJob, addFailedJob } from './failed-jobs-manager';
import * as TE from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';

// Logger utility
const logger = {
  info: (message: string) => console.log(`[Worker] ℹ️ ${message}`),
  error: (message: string, error?: any) => console.error(`[Worker] ❌ ${message}`, error),
  success: (message: string) => console.log(`[Worker] ✅ ${message}`),
  warning: (message: string) => console.warn(`[Worker] ⚠️ ${message}`),
  debug: (message: string) => console.log(`[Worker] 🔍 ${message}`)
};

// Map of extractor names to functions
const extractorMap = {
  'extractAndTranslateTags': extractAndTranslateTags,
  'extractLatLongAsString': extractLatLongAsString,
  'checkIfListingExists': checkIfListingExists,
  'extractDescription': extractDescription
} as const;

type ExtractorName = keyof typeof extractorMap;

if (scrapingQueue) {
  let browser: Browser | null = null;

  // Initialize browser when worker starts
  const initializeBrowser = async () => {
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

  // Clean up browser when worker shuts down
  const cleanup = async () => {
    if (browser) {
      logger.info('Closing browser');
      await browser.close();
      browser = null;
      logger.success('Browser closed');
    }
  };

  // Add event listener for failed jobs
  scrapingQueue.on('failed', async (job, error) => {
    const { id, url } = job.data as { id: string; url: string; extractors: ExtractorName[] };
    logger.error(`Job ${id} failed permanently after ${job.attemptsMade} attempts: ${error.message}`);
    
    // Record the failed job for manual retry through the admin UI
    await addFailedJob(id, url, error.message || 'Unknown error');
    logger.info(`Job ${id} added to failed jobs list`);
  });

  // Process each job
  scrapingQueue.process('scrape-listing', async (job) => {
    // Existing processing code for scrape-listing jobs
    return processJobLogic(job);
  });

  // Also handle 'process-listing' jobs with the same logic
  scrapingQueue.process('process-listing', async (job) => {
    logger.info(`Received process-listing job, using same handler as scrape-listing`);
    return processJobLogic(job);
  });

  // Extract job processing logic into a shared function
  async function processJobLogic(job: any) {
    const { id, url, extractors: extractorNames, fromFailedJobs = false } = job.data as {
      id: string;
      url: string;
      extractors: ExtractorName[];
      fromFailedJobs?: boolean;
    };
    logger.info(`Processing listing ${id}: ${url}${fromFailedJobs ? ' (from failed jobs)' : ''}`);

    try {
      // Ensure browser is initialized
      const browser = await initializeBrowser();

      // Get the actual extractor functions
      const extractors = extractorNames
        .map(name => extractorMap[name])
        .filter((fn): fn is Extractor => fn !== undefined);

      // Create pipeline
      const pipeline = (page: Page) => {
        const extractorResults = extractors.map(extractor => extractor(page));
        return pipe(
          extractorResults,
          TE.sequenceArray,
          TE.map(results => results.reduce<ExtractedData>((acc, result) => ({
            tags: [...(acc.tags || []), ...(result.tags || [])],
            translatedTags: { ...(acc.translatedTags || {}), ...(result.translatedTags || {}) },
            description: result.description || acc.description,
            latLong: result.latLong || acc.latLong,
            latLongString: result.latLongString || acc.latLongString
          }), {} as ExtractedData))
        );
      };

      // Process the listing
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        const result = await pipeline(page)();

        if (result._tag === 'Right') {
          const extractedData = result.right;
          
          // Check if the listing is removed/not found
          if (extractedData.isRemoved) {
            logger.info(`Listing ${id} (${url}) is removed or not found`);
            
            // Remove the listing from the database
            const removalResult = await removeListingFromDatabase(id);
            
            if (removalResult) {
              logger.success(`Successfully removed listing ${id} from database`);
            } else {
              logger.warning(`Failed to remove listing ${id} from database - may not exist already`);
            }
            
            // Always remove from failed jobs list if it was there
            await removeFailedJob(id);
            logger.success(`Completed processing of removed listing ${id}`);
            
            // No need to save extracted data for removed listings
            return;
          }
          
          // For existing listings, continue with normal processing...
          // Check if we were attempting to extract latLong values
          const isExtractingLatLong = extractors.some(extractor => 
            extractor.name === 'extractLatLong' || extractor.name === 'extractLatLongAsString'
          );

          if (isExtractingLatLong) {
            // Check if latLong data was successfully extracted
            const hasLatLong = !!(extractedData.latLong || extractedData.latLongString);
            
            // Log detailed information about extraction
            if (hasLatLong) {
              const latLongValue = extractedData.latLongString || 
                (extractedData.latLong ? `${extractedData.latLong.lat},${extractedData.latLong.long}` : 'N/A');
              logger.success(`Successfully extracted latLong for listing ${id}: ${latLongValue}`);
            } else {
              logger.error(`Failed to extract latLong for listing ${id}`);
              
              // If this was from failed jobs list and still doesn't have latLong, keep it in the failed jobs list
              if (fromFailedJobs) {
                logger.info(`Keeping job ${id} in failed jobs list due to missing latLong data`);
                throw new Error('Failed to extract latLong data');
              }
            }

            // Only remove from failed jobs list if:
            // 1. It was from the failed jobs list, AND
            // 2. We successfully extracted latLong data
            if (fromFailedJobs && hasLatLong) {
              logger.success(`Removing job ${id} from failed jobs list after successful latLong extraction`);
              await removeFailedJob(id);
            } else if (fromFailedJobs) {
              logger.info(`Job ${id} will remain in failed jobs list until latLong is successfully extracted`);
            }
          }

          // Always update the listing data
          logger.info(`Updating listing data for ${id}`);
          await updateListingData(id, extractedData);
          return extractedData;
        } else {
          throw result.left;
        }
      } finally {
        await page.close();
      }
    } catch (error) {
      logger.error(`Failed to process listing ${id}`, error);
      throw error;
    }
  }

  // Handle worker shutdown
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  logger.success('Worker initialized and ready to process jobs');
} else {
  logger.error('Failed to initialize worker: Queue not available');
} 