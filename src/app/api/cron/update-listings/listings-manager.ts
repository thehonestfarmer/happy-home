import fs from 'fs/promises';
import type { ListingsData, ScrapedData, Listing } from './types';

export async function readListings(): Promise<ListingsData> {
  try {
    const data = await fs.readFile('./public/listings.json', 'utf8');
    const listings = JSON.parse(data);
    console.log(`Read ${Object.keys(listings.newListings).length} existing listings`);
    return listings;
  } catch (error) {
    console.log('No existing listings found, creating new file');
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

  // Create map of existing addresses for quick lookup
  const addressMap = new Map(
    Object.values(existingListings.newListings)
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
  scrapedData.addresses.forEach((address, index) => {
    try {
      const normalizedAddress = address.toLowerCase();

      // Skip if we've already processed this address in this batch
      if (seenAddresses.has(normalizedAddress)) {
        console.log(`🔄 Skipping duplicate address: ${address}`);
        return;
      }
      seenAddresses.set(normalizedAddress, index);

      const existingId = addressMap.get(normalizedAddress);
      const newId = scrapedData.ids[index];

      // Debug logging for tags
      const tags = scrapedData.tags[index];
      const tagType = Array.isArray(tags) ? 'array' : typeof tags;
      console.log(`\nProcessing [${index}]: ${address}`);
      console.log(`Tags type: ${tagType}`);
      if (tagType === 'array') {
        console.log(`Tags length: ${tags.length}`);
      }
      
      // Handle tags safely
      let tagsString = '';
      if (Array.isArray(tags)) {
        tagsString = tags.join(', ');
      } else if (typeof tags === 'string') {
        tagsString = tags;
      } else {
        console.warn(`⚠️ Unexpected tags format at index ${index}:`, tags);
        tagsString = String(tags || '');
      }

      const newListing: Listing = {
        id: existingId || newId,
        addresses: address,
        tags: tagsString,
        listingDetail: scrapedData.listingDetail[index],
        prices: scrapedData.prices[index],
        layout: scrapedData.layout[index],
        buildSqMeters: scrapedData.buildSqMeters[index],
        landSqMeters: scrapedData.landSqMeters[index],
      };

      if (existingId) {
        console.log(`📝 Updating existing listing: ${existingId}`);
        updatedCount++;
      } else {
        console.log(`✨ Adding new listing: ${newId}`);
        newCount++;
      }

      // If address exists, update the existing listing
      // If new, add as new listing
      mergedListings.newListings[newListing.id] = {
        ...mergedListings.newListings[newListing.id],
        ...newListing
      };
    } catch (error) {
      console.error(`❌ Error processing listing ${index}:`, error);
      errorCount++;
    }
  });

  console.log('\n=== Merge Summary ===');
  console.log(`Updated listings: ${updatedCount}`);
  console.log(`New listings: ${newCount}`);
  console.log(`Duplicate addresses skipped: ${duplicateCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total listings after merge: ${Object.keys(mergedListings.newListings).length}`);

  // Write merged listings back to file
  await fs.writeFile(
    './public/listings.json',
    JSON.stringify(mergedListings, null, 2),
    'utf8'
  );
  console.log('✅ Successfully wrote merged listings to file\n');

  return mergedListings;
} 