import { processListingsJob } from './process-updated-listings';
import path from 'path';

// Default to all-listings.json in the project root
const defaultInputFilePath = path.join(process.cwd(), 'all-listings.json');

// Allow specifying a custom path as a command line argument
const inputFilePath = process.argv[2] || defaultInputFilePath;

console.log(`Starting scraping process using file: ${inputFilePath}`);

// Start the scraping process
processListingsJob(inputFilePath)
  .then(() => console.log('Scraping process initiated successfully'))
  .catch(err => console.error('Error starting scraping process:', err)); 