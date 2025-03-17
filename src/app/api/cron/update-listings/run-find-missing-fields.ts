/**
 * Entry point script for finding listings with missing fields
 * This script is a simple wrapper that calls the main function
 */

import { findMissingFieldsAndAddToFailedJobs } from './find-missing-fields';
import fs from 'fs/promises';

// Parse command line arguments
const args = process.argv.slice(2);
let outputFilePath: string | null = null;

// Look for --outputFile argument
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--outputFile=')) {
    outputFilePath = args[i].split('=')[1];
    break;
  } else if (args[i] === '--outputFile' && i + 1 < args.length) {
    outputFilePath = args[i + 1];
    break;
  }
}

console.log('Starting to find listings with missing fields...');
if (outputFilePath) {
  console.log(`Output file for listing IDs: ${outputFilePath}`);
}

findMissingFieldsAndAddToFailedJobs(outputFilePath)
  .then(results => {
    console.log('Process completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
  }); 