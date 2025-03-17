/**
 * Test script for scraper startup
 * 
 * This is a simple test to verify that startup.ts properly parses arguments
 * and configures the scraper workers correctly.
 */

import { createContextLogger } from '../utils/logger';

// Create a logger
const logger = createContextLogger('TestStartup');

// Mock the initializeWorker function
jest.mock('../queue/worker', () => ({
  initializeWorker: jest.fn(),
}));

// Import the mocked module
import { initializeWorker } from '../queue/worker';

// Log the test starting
logger.info('Testing scraper startup...');

// Set test arguments
process.argv = [
  'node',                           // [0] Node executable (irrelevant for our test)
  'src/lib/scraper/startup.ts',     // [1] Script path (irrelevant for our test)
  '--listingConcurrency=2',         // [2] Test arg: listing concurrency
  '--detailConcurrency=4',          // [3] Test arg: detail concurrency
  '--retryLimit=5',                 // [4] Test arg: retry limit
  '--logLevel=debug',               // [5] Test arg: log level
];

// Import the startup module (this will execute it)
logger.info('Importing startup module...');
import '../startup';

// Verify environment variables were set correctly
setTimeout(() => {
  logger.info('Verifying environment variables...');
  
  const expectedValues = {
    LISTING_CONCURRENCY: '2',
    DETAIL_CONCURRENCY: '4',
    RETRY_LIMIT: '5',
    LOG_LEVEL: 'debug',
  };
  
  let allValid = true;
  
  Object.entries(expectedValues).forEach(([key, expectedValue]) => {
    const actualValue = process.env[key];
    if (actualValue === expectedValue) {
      logger.success(`✓ ${key} = ${actualValue}`);
    } else {
      logger.error(`✗ ${key}: expected ${expectedValue}, got ${actualValue}`);
      allValid = false;
    }
  });
  
  // Verify the worker was initialized
  if ((initializeWorker as jest.Mock).mock.calls.length > 0) {
    logger.success('✓ initializeWorker was called');
  } else {
    logger.error('✗ initializeWorker was not called');
    allValid = false;
  }
  
  // Log the test result
  if (allValid) {
    logger.success('All tests passed!');
    process.exit(0);
  } else {
    logger.error('Tests failed!');
    process.exit(1);
  }
}, 1000); // Wait a short time for the startup to execute 