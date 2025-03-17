import { list } from '@vercel/blob';
import { scrapeListingPage } from './process-listings';
import type { ListingsData, ScrapedData, Listing } from './types';

interface FailedScrape {
  id: string;
  url: string;
  error: Error | unknown;
  attempts: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryFailedScrapes(
  failedScrapes: FailedScrape[], 
  mergedListings: ListingsData
): Promise<void> {
  console.log('\n=== Retrying Failed Scrapes ===');
  
  for (const failed of failedScrapes) {
    if (failed.attempts >= MAX_RETRY_ATTEMPTS) {
      console.log(`❌ Max retries exceeded for ${failed.id}, skipping...`);
      continue;
    }

    console.log(`🔄 Retry attempt ${failed.attempts + 1} for ${failed.id}`);
    try {
      await sleep(RETRY_DELAY * failed.attempts); // Exponential backoff
      const additionalDetails = await scrapeListingPage(failed.url);
      
      if (additionalDetails && !(additionalDetails instanceof Error)) {
        const listing = mergedListings.newListings[failed.id];
        if (listing) {
          listing.listingImages = additionalDetails.listingImages;
          listing.recommendedText = additionalDetails.recommendedText;
          listing.isDetailSoldPresent = additionalDetails.isDetailSoldPresent;
          console.log(`✅ Retry successful for ${failed.id}`);
          console.log(`📸 Found ${additionalDetails.listingImages?.length || 0} images`);
        }
      } else {
        failed.attempts++;
        console.warn(`⚠️ Retry failed for ${failed.id}`);
      }
    } catch (error) {
      failed.attempts++;
      failed.error = error;
      console.error(`❌ Error during retry for ${failed.id}:`, error);
    }
  }

  // Log final retry results
  const remainingFailed = failedScrapes.filter(f => f.attempts >= MAX_RETRY_ATTEMPTS);
  if (remainingFailed.length > 0) {
    console.log('\n=== Failed Scrapes After Retries ===');
    remainingFailed.forEach(f => {
      console.log(`❌ ${f.id} (${f.url}): Failed after ${f.attempts} attempts`);
    });
  }
}

export async function readListings(): Promise<ListingsData> {
  // Check if in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      // Import local file system module
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(process.cwd(), '/public/batch_test_results.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`Read ${Object.keys(data).length} listings from local file`);
      return data;
    } catch (error) {
      console.error('Error reading local listings file:', error);
      return { newListings: {} };
    }
  }

  try {
    // List blobs to find the most recent listings.json
    const { blobs } = await list();
    const listingsBlob = blobs
      .filter(blob => blob.pathname.startsWith('listings'))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

    if (!listingsBlob) {
      console.log('No existing listings blob found, creating new data');
      return { newListings: {} };
    }

    // Get the blob content
    const response = await fetch(listingsBlob.url);
    if (!response.ok) {
      throw new Error('Failed to fetch blob');
    }

    const listings = await response.json() as ListingsData;
    console.log(`Read ${Object.keys(listings).length} existing listings from blob`);
    console.log(`Blob URL: ${listingsBlob.url}`);
    console.log(`Last updated: ${listingsBlob.uploadedAt}`);
    
    return listings;
  } catch (error) {
    console.error('Error reading listings from blob:', error);
    return { newListings: {} };
  }
}

export async function mergeListings(
  existingListings: ListingsData, 
  scrapedData: ScrapedData
): Promise<ListingsData> {
  console.log('\n=== Starting Merge Process ===');
  console.log(`Existing listings: ${Object.keys(existingListings.newListings).length}`);
  console.log(`New scraped items: ${scrapedData.addresses.length}`);

  const mergedListings: ListingsData = { 
    newListings: { ...existingListings.newListings } 
  };

  // Track failed scrapes for retry
  const failedScrapes: FailedScrape[] = [];

  // Create map of existing addresses for quick lookup
  const addressMap = new Map(
    Object.values(existingListings.newListings)
      .filter(listing => listing.addresses)
      .map(listing => [listing.addresses.toLowerCase(), listing.id])
  );
  console.log(`Created address map with ${addressMap.size} entries`);

  // Track addresses we've seen in this batch of scraped data
  const seenAddresses = new Map<string, number>();

  let updatedCount = 0;
  let newCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  // First pass: identify duplicates in scraped data
  scrapedData.addresses.forEach((address, index) => {
    const normalizedAddress = address.toLowerCase();
    const count = seenAddresses.get(normalizedAddress) || 0;
    seenAddresses.set(normalizedAddress, count + 1);
  });

  // Log any duplicates found in scraped data
  seenAddresses.forEach((count, address) => {
    if (count > 1) {
      console.log(`⚠️ Found ${count} duplicates for address: ${address}`);
      duplicateCount += count - 1;
    }
  });

  // Clear seen addresses for second pass
  seenAddresses.clear();

  // Process each scraped listing
  for (let index = 0; index < scrapedData.addresses.length; index++) {
    try {
      const address = scrapedData.addresses[index];
      const normalizedAddress = address.toLowerCase();

      // Skip if we've already processed this address in this batch
      if (seenAddresses.has(normalizedAddress)) {
        console.log(`🔄 Skipping duplicate address: ${address}`);
        continue;
      }
      seenAddresses.set(normalizedAddress, index);

      const existingId = addressMap.get(normalizedAddress);
      const newId = scrapedData.ids[index];

      // Debug logging for tags
      const tag = scrapedData.tags[index];
      console.log(`\nProcessing [${index}]: ${address}`);
      console.log(`Tag value: ${tag}`);
      
      // Handle tags - now they're directly strings from the translation
      const newListing: Listing = {
        id: existingId || newId,
        addresses: address,
        address: scrapedData.englishAddress?.[index] || address, // Use englishAddress if available
        tags: tag || '', // Use the tag directly, with empty string fallback
        listingDetail: scrapedData.listingDetail[index],
        prices: scrapedData.prices[index],
        layout: scrapedData.layout[index],
        buildSqMeters: scrapedData.buildSqMeters[index],
        landSqMeters: scrapedData.landSqMeters[index],
      };

      // If this is a new listing, scrape additional details
      if (!existingId) {
        console.log(`✨ Scraping details for new listing: ${newId}`);
        try {
          const additionalDetails = await scrapeListingPage(scrapedData.listingDetail[index]);
          if (additionalDetails && !(additionalDetails instanceof Error)) {
            newListing.listingImages = additionalDetails.listingImages;
            newListing.recommendedText = additionalDetails.recommendedText;
            newListing.isDetailSoldPresent = additionalDetails.isDetailSoldPresent;
            console.log(`📸 Found ${additionalDetails.listingImages?.length || 0} images`);
          } else {
            console.warn(`⚠️ Failed to scrape additional details for ${newId}`);
            failedScrapes.push({
              id: newId,
              url: scrapedData.listingDetail[index],
              error: additionalDetails,
              attempts: 1
            });
          }
        } catch (error) {
          console.error(`❌ Error scraping additional details for ${newId}:`, error);
          failedScrapes.push({
            id: newId,
            url: scrapedData.listingDetail[index],
            error,
            attempts: 1
          });
        }
        newCount++;
      } else {
        console.log(`📝 Updating existing listing: ${existingId}`);
        updatedCount++;
      }

      mergedListings.newListings[newListing.id] = {
        ...mergedListings.newListings[newListing.id],
        ...newListing
      };
    } catch (error) {
      console.error(`❌ Error processing listing ${index}:`, error);
      errorCount++;
    }
  }

  // Retry failed scrapes
  if (failedScrapes.length > 0) {
    console.log(`\n🔄 Found ${failedScrapes.length} failed scrapes to retry`);
    await retryFailedScrapes(failedScrapes, mergedListings);
  }

  console.log('\n=== Merge Summary ===');
  console.log(`Updated listings: ${updatedCount}`);
  console.log(`New listings: ${newCount}`);
  console.log(`Duplicate addresses skipped: ${duplicateCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Failed scrapes: ${failedScrapes.filter(f => f.attempts >= MAX_RETRY_ATTEMPTS).length}`);
  console.log(`Total listings after merge: ${Object.keys(mergedListings.newListings).length}`);

  return mergedListings;
} 