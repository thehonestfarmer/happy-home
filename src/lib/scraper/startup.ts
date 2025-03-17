/**
 * Scraper Worker Startup
 * 
 * Entry point for starting scraper workers with appropriate concurrency settings.
 * This script parses command line arguments and initializes workers based on settings.
 */

import { createContextLogger } from './utils/logger';
import { initializeWorker } from './queue/worker';

// Create a context-specific logger
const logger = createContextLogger('Startup');

/**
 * Parse command-line arguments
 * 
 * @returns Parsed arguments as key-value pairs
 */
const parseArgs = () => {
  const args: Record<string, string | number | boolean> = {};
  
  // Process command line arguments (format: --key=value or --flag)
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      
      if (value === undefined) {
        // Flag without value (--flag)
        args[key] = true;
      } else if (!isNaN(Number(value))) {
        // Numeric value
        args[key] = Number(value);
      } else {
        // String value
        args[key] = value;
      }
    }
  });
  
  return args;
};

/**
 * Configure worker settings
 * 
 * @param args Command line arguments
 * @returns Worker configuration
 */
const configureWorkers = (args: Record<string, string | number | boolean>) => {
  // Default settings
  const config = {
    listingConcurrency: 1,  // Default to 1 listing job at a time
    detailConcurrency: 3,   // Default to 3 detail jobs at a time
    retryLimit: 3,          // Default retry limit
    logLevel: 'info',       // Default log level
  };
  
  // Override with args if provided
  if (args.listingConcurrency && typeof args.listingConcurrency === 'number') {
    config.listingConcurrency = args.listingConcurrency;
  }
  
  if (args.detailConcurrency && typeof args.detailConcurrency === 'number') {
    config.detailConcurrency = args.detailConcurrency;
  }
  
  if (args.retryLimit && typeof args.retryLimit === 'number') {
    config.retryLimit = args.retryLimit;
  }
  
  if (args.logLevel && typeof args.logLevel === 'string') {
    config.logLevel = args.logLevel;
  }
  
  return config;
};

/**
 * Start workers with appropriate configuration
 */
const startWorkers = async () => {
  try {
    // Parse command line arguments
    const args = parseArgs();
    
    // Configure worker settings
    const config = configureWorkers(args);
    
    logger.info('Starting scraper workers with configuration:');
    logger.info(`Listing Concurrency: ${config.listingConcurrency}`);
    logger.info(`Detail Concurrency: ${config.detailConcurrency}`);
    logger.info(`Retry Limit: ${config.retryLimit}`);
    logger.info(`Log Level: ${config.logLevel}`);
    
    // Set environment variables for worker configuration
    process.env.LISTING_CONCURRENCY = config.listingConcurrency.toString();
    process.env.DETAIL_CONCURRENCY = config.detailConcurrency.toString();
    process.env.RETRY_LIMIT = config.retryLimit.toString();
    process.env.LOG_LEVEL = config.logLevel;
    
    // Initialize worker with configuration
    initializeWorker();
    
    logger.success('Workers started successfully');
    
    // Handle process shutdown
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
    
    // Keep the process alive
    logger.info('Workers are now processing jobs. Press Ctrl+C to stop.');
  } catch (error) {
    logger.error('Failed to start workers', error);
    process.exit(1);
  }
};

/**
 * Handle graceful shutdown
 */
const handleShutdown = async () => {
  logger.info('Shutting down workers...');
  
  // Implement any necessary cleanup here
  
  logger.success('Workers shut down gracefully');
  process.exit(0);
};

// Execute startup
startWorkers().catch(error => {
  logger.error('Unhandled error during startup', error);
  process.exit(1);
}); 