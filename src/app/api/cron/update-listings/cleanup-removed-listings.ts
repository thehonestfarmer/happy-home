/**
 * Entry point script for cleaning up removed/non-existent listings
 * This script checks all listings to see if they still exist on the source websites
 * and removes any that don't from the database
 */

import { cleanUpRemovedListings } from './find-missing-fields';

console.log('Starting cleanup of removed/non-existent listings...');

cleanUpRemovedListings()
  .then(results => {
    console.log('Cleanup process completed successfully.');
    console.log(results);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error running cleanup script:', err);
    process.exit(1);
  }); 