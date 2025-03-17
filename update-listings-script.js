import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the files
const allListingsPath = path.join(process.cwd(), 'all-listings.json');
const failedJobsPath = path.join(process.cwd(), 'src/app/api/cron/update-listings/data/failed-scraping-jobs.json');

// Function to process all listings
async function processListings() {
  try {
    console.log('Reading all-listings.json...');
    const allListingsData = JSON.parse(fs.readFileSync(allListingsPath, 'utf8'));
    
    console.log('Reading failed-scraping-jobs.json...');
    let failedJobs = [];
    try {
      failedJobs = JSON.parse(fs.readFileSync(failedJobsPath, 'utf8'));
    } catch (error) {
      console.log('Failed jobs file not found or invalid, creating new one');
    }

    // Track statistics
    const stats = {
      totalListings: 0,
      emptyTags: 0,
      missingLatLong: 0,
      missingLatLongString: 0,
      alreadyInFailedJobs: 0,
      removedFromFailedJobs: 0,
      addedToFailedJobs: 0,
      updatedIsDetailSoldPresent: 0,
      stubLatLongString: 0
    };

    // Create a map of existing failed job IDs for quicker lookup
    const existingFailedJobIdsMap = new Map(failedJobs.map(job => [job.id, job]));
    const existingFailedJobIds = new Set(failedJobs.map(job => job.id));

    // Process each listing
    const { newListings } = allListingsData;
    let modified = false;
    let failedJobsModified = false;
    
    console.log('Processing listings...');
    for (const [id, listing] of Object.entries(newListings)) {
      stats.totalListings++;
      
      // 1. Check for missing latLongString and handle it
      if (!listing.latLongString) {
        stats.missingLatLongString++;
        
        // Set latLongString to empty string
        newListings[id].latLongString = "";
        
        // Set isDetailSoldPresent to true
        newListings[id].isDetailSoldPresent = true;
        
        // Remove from failed jobs if it exists there
        if (existingFailedJobIds.has(id)) {
          // We'll filter it out later
          stats.removedFromFailedJobs++;
          failedJobsModified = true;
        }
        
        modified = true;
        stats.stubLatLongString++;
        stats.updatedIsDetailSoldPresent++;
      }
      
      // 2. Check if latLong is missing and update isDetailSoldPresent accordingly
      if (!listing.latLong) {
        stats.missingLatLong++;
        
        // Set isDetailSoldPresent to true if not already done
        if (!newListings[id].isDetailSoldPresent) {
          newListings[id].isDetailSoldPresent = true;
          modified = true;
          stats.updatedIsDetailSoldPresent++;
        }
      }
      
      // 3. Check if tags array is empty
      if (!listing.tags || listing.tags.length === 0) {
        stats.emptyTags++;
        
        // Check if this listing is already in failed jobs
        if (existingFailedJobIds.has(id)) {
          stats.alreadyInFailedJobs++;
          continue;
        }
        
        // Add to failed jobs
        const url = listing.listingUrl || listing.url;
        if (url) {
          failedJobs.push({
            id,
            url,
            failedAt: new Date().toISOString(),
            reason: "Missing tags, requires scraping",
            retryCount: 0
          });
          stats.addedToFailedJobs++;
          failedJobsModified = true;
        }
      }
    }
    
    // Filter out any listings from failed jobs that should be removed due to missing latLongString
    if (stats.removedFromFailedJobs > 0) {
      console.log(`Removing ${stats.removedFromFailedJobs} entries from failed-scraping-jobs.json due to missing latLongString`);
      
      // Create a new array without the IDs we need to remove
      failedJobs = failedJobs.filter(job => {
        const listing = newListings[job.id];
        // Keep the job if either the listing doesn't exist or it has a latLongString
        return !listing || listing.latLongString !== "";
      });
    }
    
    // Write back the updated files
    if (failedJobsModified) {
      console.log(`Writing updated failed-scraping-jobs.json (added: ${stats.addedToFailedJobs}, removed: ${stats.removedFromFailedJobs})`);
      fs.writeFileSync(failedJobsPath, JSON.stringify(failedJobs, null, 2));
    }
    
    if (modified) {
      console.log(`Writing updated all-listings.json with the following changes:`);
      console.log(`- Updated isDetailSoldPresent: ${stats.updatedIsDetailSoldPresent}`);
      console.log(`- Added stub latLongString: ${stats.stubLatLongString}`);
      fs.writeFileSync(allListingsPath, JSON.stringify(allListingsData, null, 2));
    }
    
    console.log('\nProcess completed with the following stats:');
    console.log(`- Total listings processed: ${stats.totalListings}`);
    console.log(`- Listings with empty tags: ${stats.emptyTags}`);
    console.log(`- Listings already in failed jobs: ${stats.alreadyInFailedJobs}`);
    console.log(`- Listings added to failed jobs: ${stats.addedToFailedJobs}`);
    console.log(`- Listings missing latLong: ${stats.missingLatLong}`);
    console.log(`- Listings missing latLongString: ${stats.missingLatLongString}`);
    console.log(`- Listings removed from failed jobs: ${stats.removedFromFailedJobs}`);
    console.log(`- Updated isDetailSoldPresent: ${stats.updatedIsDetailSoldPresent}`);
    console.log(`- Added stub latLongString: ${stats.stubLatLongString}`);
    
  } catch (error) {
    console.error('Error processing listings:', error);
  }
}

// Run the function
processListings(); 