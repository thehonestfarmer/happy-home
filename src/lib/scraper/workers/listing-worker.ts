import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { extractSearchListings } from '../extractors/search-listings';
import { initRedisConnection } from '../utils/redis';
import { logger } from '../utils/logger';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchPageJob {
  baseUrl: string;
  pageNumber: number;
}

/**
 * Process a search page and extract listings
 */
const processSearchPage = async (job: Job<SearchPageJob>) => {
  const { baseUrl, pageNumber } = job.data;
  const url = pageNumber === 1 ? baseUrl : `${baseUrl}?page=${pageNumber}`;
  
  logger.info(`Processing search page: ${url}`);
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to search page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract listings using our functional extractor
    const listingsResult = await pipe(
      extractSearchListings(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract listings: ${error.message}`);
        return Promise.resolve([]);
      })
    )();
    
    if (listingsResult.length === 0) {
      logger.warn(`No listings found on page ${pageNumber}`);
      return { success: true, listingsFound: 0 };
    }
    
    logger.success(`Found ${listingsResult.length} listings on page ${pageNumber}`);
    
    // Add each listing to the database and queue detail page extraction
    const detailQueue = job.queueEvents?.queueName === 'listing-scraper' 
      ? await job.queue.getQueueClient('detail-extraction')
      : null;
    
    let newListings = 0;
    let existingListings = 0;
    
    for (const listing of listingsResult) {
      // Check if the listing already exists in the database
      const { data: existingListing } = await supabase
        .from('real_estate_listings')
        .select('id')
        .eq('listing_url', listing.detailUrl)
        .maybeSingle();
        
      if (existingListing) {
        existingListings++;
        continue;
      }
      
      // Insert the new listing
      const { data: newListing, error } = await supabase
        .from('real_estate_listings')
        .insert({
          listing_url: listing.detailUrl,
          address: listing.address,
          english_address: '', // Will be filled by detail extraction
          floor_plan: listing.floorPlan,
          price: parseFloat(listing.price.replace(/[^0-9.]/g, '')),
          land_area_sqm: parseFloat(listing.landArea.replace(/[^0-9.]/g, '')),
          build_area_sqm: parseFloat(listing.buildArea.replace(/[^0-9.]/g, '')),
          real_estate_company: 'Happy Home',
          is_sold: false,
          tags: listing.tags,
          recommended_text: listing.recommendedPoints,
          status: 'ready',
          scraped_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) {
        logger.error(`Failed to insert listing: ${error.message}`);
        continue;
      }
      
      newListings++;
      
      // Add detail page job to queue if the queue client is available
      if (detailQueue) {
        await detailQueue.add(
          `detail-${newListing.id}`,
          {
            listingId: newListing.id,
            targetUrl: listing.detailUrl
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000 // 1 second initial delay
            },
            removeOnComplete: true,
            removeOnFail: false
          }
        );
      }
    }
    
    // Log results
    logger.info(`Page ${pageNumber} summary: ${newListings} new listings, ${existingListings} existing listings`);
    
    return { 
      success: true, 
      listingsFound: listingsResult.length,
      newListings,
      existingListings
    };
  } catch (error) {
    logger.error(`Error processing search page: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Process a job to scrape multiple search pages
 */
const processSearchPagesJob = async (job: Job<{baseUrl: string; pagesCount: number}>) => {
  const { baseUrl, pagesCount } = job.data;
  
  logger.info(`Starting to scrape ${pagesCount} search pages from ${baseUrl}`);
  
  // Create individual jobs for each page
  for (let i = 1; i <= pagesCount; i++) {
    await job.queue.add(
      `search-page-${i}`,
      {
        baseUrl,
        pageNumber: i
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
  }
  
  logger.success(`Added ${pagesCount} search page jobs to the queue`);
  return { success: true, pagesQueued: pagesCount };
};

/**
 * Initialize the listing worker
 */
export const initListingWorker = async () => {
  const connection = await initRedisConnection();
  
  // Create the worker
  const worker = new Worker(
    'listing-scraper',
    async (job) => {
      logger.info(`Processing job: ${job.name} (${job.id})`);
      
      // Handle different job types
      if (job.name.startsWith('search-page-')) {
        return processSearchPage(job as Job<SearchPageJob>);
      } else if (job.name === 'scrape-search-pages') {
        return processSearchPagesJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    { connection }
  );
  
  // Set up event handlers
  worker.on('completed', (job) => {
    logger.success(`Job completed: ${job.name} (${job.id})`);
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Job failed: ${job?.name} (${job?.id}): ${error.message}`);
  });
  
  logger.info('Listing worker initialized');
  
  return worker;
}; 