import fs from 'fs/promises';
import path from 'path';
import { addFailedJob } from './failed-jobs-manager';
import { processListingsJob, checkIfListingExists } from './process-updated-listings';
import type { Listing } from './types';

// Define interfaces for parsed data structure
interface AllListings {
  newListings: {
    [key: string]: Listing;
  };
}

/**
 * Script to identify listings without tags or latLong fields and add them to failed-scraping-jobs
 * This is a one-off utility to help prepare for PostgreSQL migration
 * @param outputFilePath Optional path to write listing IDs with missing fields
 */
export async function findMissingFieldsAndAddToFailedJobs(outputFilePath?: string | null) {
  console.log('Starting scan for listings with missing fields...');
  
  // Path to data files
  const allListingsPath = path.join(process.cwd(), 'all-listings.json');
  
  try {
    // Read all-listings.json
    console.log(`Reading data from ${allListingsPath}...`);
    const data = await fs.readFile(allListingsPath, 'utf8');
    const listings = JSON.parse(data) as AllListings;
    
    if (!listings.newListings) {
      throw new Error('Invalid format: "newListings" not found in all-listings.json');
    }
    
    const allListings = Object.entries(listings.newListings);
    console.log(`Found ${allListings.length} total listings`);
    
    // Track counts
    let missingTagsCount = 0;
    let missingLatLongCount = 0;
    let missingBothCount = 0;
    let addedToFailedJobsCount = 0;
    
    // Track listings with missing fields
    const listingsToProcess = [];
    
    // Prepare array for output file if needed
    const outputLines: string[] = [];
    
    // Find listings with missing fields
    for (const [id, listing] of allListings) {
      const missingTags = !listing.tags;
      const missingLatLong = !('latLong' in listing);
      
      if (missingTags) missingTagsCount++;
      if (missingLatLong) missingLatLongCount++;
      if (missingTags && missingLatLong) missingBothCount++;
      
      // Add to failed jobs if either field is missing
      if (missingTags || missingLatLong) {
        const url = listing.listingDetail || (listing as any).listingUrl;
        
        if (!url) {
          console.warn(`⚠️ Listing ${id} has missing fields but no URL to scrape, skipping`);
          continue;
        }
        
        console.log(`Adding listing ${id} to failed jobs (${url})`);
        
        // Construct reason message
        const reasons = [];
        if (missingTags) reasons.push('missing tags');
        if (missingLatLong) reasons.push('missing latLong');
        const reason = `One-off reprocessing needed: ${reasons.join(' and ')}`;
        
        // Add to failed jobs
        await addFailedJob(id, url, reason);
        addedToFailedJobsCount++;
        
        // Add to the list of listings to process
        listingsToProcess.push({
          id,
          url
        });
        
        // Add to output lines if we have an output file
        if (outputFilePath) {
          let address = '';
          // Try to get a human-readable address if available
          if (listing.address) {
            address = ` - ${listing.address}`;
          } else if ((listing as any).prefecture || (listing as any).city) {
            const prefecture = (listing as any).prefecture || '';
            const city = (listing as any).city || '';
            address = ` - ${prefecture} ${city}`.trim();
          }
          
          // Format with ID, address, and URL on a single clean line
          const outputLine = `${id}${address} (${url})`;
          // Remove any newlines or tabs that might break the formatting
          const cleanLine = outputLine.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
          outputLines.push(cleanLine);
        }
      }
    }
    
    // Write to output file if specified
    if (outputFilePath && outputLines.length > 0) {
      try {
        await fs.writeFile(outputFilePath, outputLines.join('\n'), 'utf8');
        console.log(`Wrote ${outputLines.length} listing IDs to ${outputFilePath}`);
      } catch (writeError) {
        console.error(`Error writing to output file:`, writeError);
      }
    }
    
    // Print results
    console.log('\n=== Results ===');
    console.log(`Total listings: ${allListings.length}`);
    console.log(`Listings missing tags: ${missingTagsCount}`);
    console.log(`Listings missing latLong: ${missingLatLongCount}`);
    console.log(`Listings missing both: ${missingBothCount}`);
    console.log(`Total added to failed jobs: ${addedToFailedJobsCount}`);
    console.log('\nDone! You can now view these in the Admin UI and retry them.');
    
    return {
      totalListings: allListings.length,
      missingTags: missingTagsCount,
      missingLatLong: missingLatLongCount,
      missingBoth: missingBothCount,
      addedToFailedJobs: addedToFailedJobsCount
    };
    
  } catch (error) {
    console.error('Error processing listings:', error);
    throw error;
  }
}

/**
 * Check all listings to see if they still exist (aren't 404/removed)
 * and remove non-existent listings from the database
 */
export async function cleanUpRemovedListings() {
  try {
    console.log('Starting cleanup of removed/non-existent listings...');
    
    // Only use the checkIfListingExists extractor
    await processListingsJob(
      path.join(process.cwd(), 'all-listings.json'),
      [checkIfListingExists],
      5
    );
    
    console.log('Completed cleanup of removed listings');
    console.log('Any removed listings have been deleted from the database');
    
    return {
      success: true,
      message: 'Cleanup of removed listings completed successfully'
    };
  } catch (error) {
    console.error('Error during cleanup of removed listings:', error);
    throw error;
  }
}

// Export as default as well
export default findMissingFieldsAndAddToFailedJobs; 