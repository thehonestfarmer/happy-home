import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { extractorRegistry } from '../extractors';
import { initRedisConnection } from '../utils/redis';
import { logger } from '../utils/logger';
import { mergeRecordData } from '../utils/merge-record';
import { saveListingToJson } from '../utils/json-backup';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface DetailPageJob {
  listingId: string;
  targetUrl: string;
  retryCount?: number;
}

/**
 * Process a detail page extraction job
 */
const processDetailPage = async (job: Job<DetailPageJob>) => {
  const { listingId, targetUrl, retryCount = 0 } = job.data;
  
  logger.info(`Processing detail page for listing ${listingId}: ${targetUrl}`);
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to detail page
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if the listing is sold
    const isSoldResult = await pipe(
      extractorRegistry.extractIsSold(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to check if listing is sold: ${error.message}`);
        return Promise.resolve(false);
      })
    )();
    
    // Extract listing images
    const imagesResult = await pipe(
      extractorRegistry.extractListingImages(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract listing images: ${error.message}`);
        return Promise.resolve([]);
      })
    )();
    
    // Extract latitude and longitude
    const latitudeResult = await pipe(
      extractorRegistry.extractLatitude(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract latitude: ${error.message}`);
        return Promise.resolve(null);
      })
    )();
    
    const longitudeResult = await pipe(
      extractorRegistry.extractLongitude(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract longitude: ${error.message}`);
        return Promise.resolve(null);
      })
    )();
    
    // Extract English address (this would use a translation service)
    const englishAddressResult = await pipe(
      extractorRegistry.extractEnglishAddress(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract English address: ${error.message}`);
        return Promise.resolve('');
      })
    )();
    
    // Extract about property information
    const aboutPropertyResult = await pipe(
      extractorRegistry.extractAboutProperty(page),
      TE.getOrElse((error) => {
        logger.error(`Failed to extract about property: ${error.message}`);
        return Promise.resolve('');
      })
    )();
    
    // Prepare the updated data
    const updateData: Record<string, any> = {
      is_sold: isSoldResult,
      listing_images: imagesResult,
      last_updated: new Date().toISOString()
    };
    
    // Only add non-null/undefined values
    if (latitudeResult !== null) updateData.lat = latitudeResult;
    if (longitudeResult !== null) updateData.long = longitudeResult;
    if (englishAddressResult) updateData.english_address = englishAddressResult;
    if (aboutPropertyResult) updateData.about_property = aboutPropertyResult;
    
    // Update the database using the merge strategy
    const mergeResult = await mergeRecordData(
      supabase,
      'real_estate_listings',
      { column: 'id', value: listingId },
      updateData
    );
    
    if (mergeResult.error) {
      throw new Error(`Failed to update listing in database: ${mergeResult.error.message}`);
    }
    
    // Save to JSON backup
    await saveListingToJson(listingId, mergeResult.data);
    
    // Update the job status to completed
    await supabase
      .from('scrape_jobs')
      .upsert({
        job_id: job.id,
        job_type: 'detail',
        status: 'completed',
        target_url: targetUrl,
        listing_id: listingId,
        attempts: retryCount,
        completed_at: new Date().toISOString()
      });
    
    logger.success(`Successfully processed detail page for listing ${listingId}`);
    
    return {
      success: true,
      listingId,
      isSold: isSoldResult,
      hasImages: imagesResult.length > 0,
      hasLocation: latitudeResult !== null && longitudeResult !== null
    };
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error processing detail page: ${errorMessage}`);
    
    // Log the job failure in the database
    await supabase
      .from('scrape_jobs')
      .upsert({
        job_id: job.id,
        job_type: 'detail',
        status: 'failed',
        target_url: targetUrl,
        listing_id: listingId,
        attempts: retryCount,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      });
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Initialize the detail worker
 */
export const initDetailWorker = async () => {
  const connection = await initRedisConnection();
  
  // Create the worker
  const worker = new Worker(
    'detail-extraction',
    async (job) => {
      logger.info(`Processing job: ${job.name} (${job.id})`);
      return processDetailPage(job as Job<DetailPageJob>);
    },
    { connection, concurrency: 3 } // Limit concurrency to 3 jobs at a time
  );
  
  // Set up event handlers
  worker.on('completed', (job) => {
    logger.success(`Job completed: ${job.name} (${job.id})`);
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Job failed: ${job?.name} (${job?.id}): ${error.message}`);
  });
  
  logger.info('Detail worker initialized');
  
  return worker;
}; 