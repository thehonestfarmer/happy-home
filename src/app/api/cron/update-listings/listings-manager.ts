import { list } from '@vercel/blob';
import { scrapeListingPage } from './process-listings';
import type { ListingsData, ScrapedData, Listing } from './types';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

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

export async function uploadListings(listings: ListingsData): Promise<void> {
  try {
    // Generate the filename with the specified format
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    const day = now.getDate();
    const year = now.getFullYear().toString().slice(-2); // Get last 2 digits of year
    const timestamp = now.getTime();

    const filename = `listings-${month}-${day}-${year}-${timestamp}.json`;

    // Convert listings to JSON
    const jsonContent = JSON.stringify(listings);

    // Upload to Vercel Blob
    const blob = await put(filename, new Blob([jsonContent], { type: 'application/json' }), {
      access: 'public',
    });

    console.log(`Successfully uploaded listings to ${blob.url}`);
    console.log(`Total listings uploaded: ${Object.keys(listings).length}`);
  } catch (error) {
    console.error('Error uploading listings to blob:', error);
    throw error;
  }
}

export async function writeListings(listings: ListingsData): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    const filePath = path.join(process.cwd(), '/public/batch_test_results.json');
    fs.writeFileSync(filePath, JSON.stringify(listings, null, 2));
  }

  return
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
        const listing = mergedListings[failed.id];
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

async function readLocalListings(): Promise<ListingsData> {
  try {

    const filePath = path.join(process.cwd(), '/public/batch_test_results.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Extract listings from newListings if present, otherwise use as-is
    const listings = data.newListings ? data.newListings : data;
    console.log(`Read ${Object.keys(listings).length} listings from local file`);
    return listings;
  } catch (error) {
    console.error('Error reading local listings file:', error);
    return {};
  }
}

export async function readListings(useBlob?: boolean): Promise<ListingsData> {
  // Check if in development mode
  if (process.env.NODE_ENV === 'development' && !useBlob) {
    return readLocalListings()
  }

  try {
    // List blobs to find the most recent listings.json
    const { blobs } = await list();
    const listingsBlob = blobs
      .filter(blob => blob.pathname.startsWith('listings'))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

    if (!listingsBlob) {
      console.log('No existing listings blob found, creating new data');
      return {};
    }

    // Get the blob content
    const response = await fetch(listingsBlob.url);
    if (!response.ok) {
      throw new Error('Failed to fetch blob');
    }

    const data = await response.json();

    // Extract listings from newListings if present, otherwise use as-is
    const listings = data.newListings ? data.newListings : data;
    console.log(`Read ${Object.keys(listings).length} existing listings from blob`);
    console.log(`Blob URL: ${listingsBlob.url}`);
    console.log(`Last updated: ${listingsBlob.uploadedAt}`);

    return listings;
  } catch (error) {
    console.error('Error reading listings from blob:', error);
    return {};
  }
}

export async function mergeListings(
  existingListings: ListingsData,
  scrapedData: ScrapedData
): Promise<ListingsData> {
  console.log('\n=== Starting Merge Process ===');
  console.log(`Existing listings: ${Object.keys(existingListings).length}`);
  console.log(`New scraped items: ${scrapedData.addresses.length}`);

  const mergedListings: ListingsData = { ...existingListings };

  // Track failed scrapes for retry
  const failedScrapes: FailedScrape[] = [];

  // Create map of existing addresses for quick lookup
  const addressMap = new Map(
    Object.values(existingListings)
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

      mergedListings[newListing.id] = {
        ...mergedListings[newListing.id],
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
  console.log(`Total listings after merge: ${Object.keys(mergedListings).length}`);

  return mergedListings;
} 