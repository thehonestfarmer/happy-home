import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the required files
const allListingsPath = path.join(process.cwd(), 'all-listings.json');
const failedJobsPath = path.join(process.cwd(), 'src/app/api/cron/update-listings/data/failed-scraping-jobs.json');

console.log('Starting to reset failed jobs...');

// Read all-listings.json
let allListings;
try {
  console.log(`Reading all listings from ${allListingsPath}`);
  const allListingsData = fs.readFileSync(allListingsPath, 'utf8');
  allListings = JSON.parse(allListingsData);
  
  if (!allListings || !allListings.newListings) {
    throw new Error('Invalid format: missing newListings object');
  }
  
  console.log(`Successfully loaded ${Object.keys(allListings.newListings).length} listings`);
} catch (error) {
  console.error(`Error reading all-listings.json: ${error.message}`);
  process.exit(1);
}

// Find listings with empty tags
const listingsWithEmptyTags = [];

for (const [id, listing] of Object.entries(allListings.newListings)) {
  // Check if tags are missing or empty
  if (!listing.tags || !Array.isArray(listing.tags) || listing.tags.length === 0) {
    // Make sure we have a URL to work with
    const url = listing.listingUrl || listing.url;
    if (url) {
      console.log(`Found listing with empty tags: ${id}`);
      listingsWithEmptyTags.push({
        id,
        url,
        failedAt: new Date().toISOString(),
        reason: "No tags extracted from listing",
        retryCount: 0
      });
    } else {
      console.warn(`Skipping listing ${id} - no URL found`);
    }
  }
}

console.log(`Found ${listingsWithEmptyTags.length} listings with empty tags`);

// Write to failed-scraping-jobs.json
try {
  console.log(`Writing to failed jobs file: ${failedJobsPath}`);
  fs.writeFileSync(failedJobsPath, JSON.stringify(listingsWithEmptyTags, null, 2));
  console.log('Successfully reset failed jobs file with listings missing tags');
} catch (error) {
  console.error(`Error writing failed-scraping-jobs.json: ${error.message}`);
  process.exit(1);
}

console.log('Reset complete!'); 