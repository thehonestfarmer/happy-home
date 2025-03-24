import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ScrapedData, ListingsData, Listing } from './types';
import { readListings, mergeListings } from './listings-manager';
import fs from 'fs';
import path from 'path';
// Import Queue conditionally since we're disabling in production
// import { Queue } from "bullmq";
// import { initRedisConnection } from "@/lib/scraper/utils/redis";

// Helper function to check if we're in production environment
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
}

function validateScrapedData(data: any): data is ScrapedData {
  if (!data) return false;
  
  console.log('Validating scraped data structure:');
  console.log('addresses:', Array.isArray(data.addresses));
  console.log('englishAddress:', Array.isArray(data.englishAddress));
  console.log('tags:', Array.isArray(data.tags));
  console.log('Sample tags:', data.tags[0]);
  
  // Check that required array fields exist
  const hasRequiredArrays = 
    Array.isArray(data.addresses) &&
    Array.isArray(data.englishAddress) &&
    Array.isArray(data.tags) &&
    Array.isArray(data.listingDetail) &&
    Array.isArray(data.prices) &&
    Array.isArray(data.layout) &&
    Array.isArray(data.buildSqMeters) &&
    Array.isArray(data.landSqMeters);
  
  if (!hasRequiredArrays) {
    console.error('Missing required array fields in scraped data');
    return false;
  }
  
  // Additional validation for format consistency
  const isValid = data.addresses.length === data.tags.length &&
                 data.addresses.length === data.listingDetail.length &&
                 data.addresses.length === data.prices.length &&
                 data.addresses.length === data.englishAddress.length;
  
  if (!isValid) {
    console.error('Array length mismatch in scraped data');
    console.log(`addresses: ${data.addresses.length}, englishAddress: ${data.englishAddress.length}, tags: ${data.tags.length}, listingDetail: ${data.listingDetail.length}`);
  }
  
  return isValid;
}

function hasListingsChanged(oldListings: ListingsData, newListings: ListingsData): boolean {
  if (Object.keys(oldListings).length !== Object.keys(newListings).length) {
    console.log('Number of listings changed');
    return true;
  }

  // Deep comparison of each listing
  for (const [id, newListing] of Object.entries(newListings)) {
    const oldListing = oldListings[id];
    if (!oldListing) {
      console.log(`New listing found: ${id}`);
      return true;
    }

    // Compare a few key fields to detect changes
    if (
      oldListing.addresses !== newListing.addresses ||
      oldListing.prices !== newListing.prices ||
      oldListing.layout !== newListing.layout
    ) {
      console.log(`Listing changed: ${id}`);
      return true;
    }
  }

  console.log('No changes detected in listings');
  return false;
}

/**
 * Reads the current listings directly from the all-listings.json file
 */
async function readListingsFile(): Promise<ListingsData> {
  try {
    const dataDir = path.join(process.cwd(), 'src/app/api/cron/update-listings/data');
    const listingsPath = path.join(dataDir, 'all-listings.json');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(listingsPath)) {
      console.log('No existing listings file found. Creating new one.');
      return {}; // Return empty object for new ListingsData format
    }
    
    const data = fs.readFileSync(listingsPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Handle both formats - if newListings exists, extract it; otherwise use as-is
    return parsedData.newListings ? parsedData.newListings : parsedData;
  } catch (error) {
    console.error('Error reading all-listings.json:', error);
    // Return empty object if file doesn't exist or can't be read
    return {}; // Return empty object for new ListingsData format
  }
}

export async function POST(request: Request) {
  try {
    // Check if we're in production - if yes, we'll skip queue operations
    if (isProduction()) {
      console.log('Skipping scraping operations in production environment');
      return NextResponse.json({ 
        success: true,
        message: 'Scraping operations disabled in production',
        data: {} 
      });
    }

    // This code will only run in development/test environments
    console.log('Starting scraping process');
    
    // Continue with the normal scraping process
    /* 
    // Redis-dependent code commented out
    const redis = await initRedisConnection();
    if (!redis) {
      throw new Error('Failed to initialize Redis connection');
    }
    
    const queue = new Queue('listing-scraper', {
      connection: redis
    });
    */

    const requestData = await request.json();
    console.log('Received data properties:', Object.keys(requestData));

    if (!validateScrapedData(requestData)) {
      console.error('Invalid scraped data');
      return NextResponse.json({ error: 'Invalid scraped data' }, { status: 400 });
    }

    console.log('Scraped data validation successful');

    // Read existing listings
    const existingListingsData = await readListingsFile();

    // The requestData is already a ScrapedData object
    const scrapedData: ScrapedData = requestData;
    
    // Create IDs if they don't exist
    if (!scrapedData.ids || scrapedData.ids.length === 0) {
      scrapedData.ids = Array(scrapedData.addresses.length).fill('').map(() => uuidv4());
    }

    // Merge with existing listings
    const mergedListings = await mergeListings(existingListingsData, scrapedData);

    console.log(`Existing listings: ${Object.keys(existingListingsData).length}`);
    console.log(`New listings: ${scrapedData.addresses.length}`);

    // Check if there were any changes
    if (
      Object.keys(existingListingsData).length === Object.keys(mergedListings).length &&
      scrapedData.addresses.length === 0
    ) {
      console.log('No changes detected, skipping save');
      return NextResponse.json({ success: true, newListings: 0 });
    }

    // Save to all-listings.json
    console.log('Saving new listings to local storage...');
    try {
      const dataDir = path.join(process.cwd(), 'src/app/api/cron/update-listings/data');
      const filePath = path.join(dataDir, 'all-listings.json');
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        console.log('Creating data directory:', dataDir);
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(mergedListings, null, 2));
      console.log('Successfully saved listings to all-listings.json');
    } catch (saveError) {
      console.error('Error saving listings to all-listings.json:', saveError);
      throw new Error('Failed to save listings to local storage');
    }

    // Return success response
    return NextResponse.json({
      success: true,
      newListings: scrapedData.addresses.length,
    });
  } catch (error) {
    console.error('Error in POST route:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {}
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

// This endpoint can be triggered manually or by Vercel cron
export async function GET() {
  try {
    // In production, provide a simple response without Redis operations
    if (isProduction()) {
      console.log('Skipping GET scraping operations in production environment');
      return NextResponse.json({ 
        success: true,
        message: 'Scraping operations disabled in production',
        data: {} 
      });
    }
    
    console.log("Starting listings update process");

    // For development, we'll just read the listings file and run a simplified process
    const currentListings = await readListingsFile();
    console.log(`Current listings count: ${Object.keys(currentListings).length}`);
    
    // Log the start of a simulated scrape
    console.log("Initiated simulated scrape process. In a real implementation, this would trigger scrapers.");
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Scrape process initiated",
      data: {
        currentListingsCount: Object.keys(currentListings).length
      }
    });
  } catch (error) {
    console.error('Error starting scrape process:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start scrape process',
      data: {}
    }, { status: 500 });
  }
} 