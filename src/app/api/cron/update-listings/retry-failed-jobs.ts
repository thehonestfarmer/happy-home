import { readFailedJobs } from './failed-jobs-manager';
import { scrapingQueue } from '@/lib/queue';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const EXTRACTORS_TO_RETRY = [
  'checkIfListingExists',
  'extractAndTranslateTags',
]

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_WORKER_COUNT = 3;

async function retryFailedJobs() {
  try {
    // 1. Read all failed jobs
    console.log('Reading failed jobs...');
    const failedJobs = await readFailedJobs();
    
    if (failedJobs.length === 0) {
      console.log('No failed jobs to retry.');
      return;
    }
    
    console.log(`Found ${failedJobs.length} failed jobs to retry.`);
    
    // 2. Parse command line arguments for worker count
    const workerCountArg = process.argv.find(arg => arg.startsWith('--workers='));
    let workerCount = DEFAULT_WORKER_COUNT;
    
    if (workerCountArg) {
      const count = parseInt(workerCountArg.split('=')[1], 10);
      if (!isNaN(count) && count > 0) {
        workerCount = count;
      }
    }
    
    // 3. Spawn workers in a separate process
    console.log(`Spawning ${workerCount} workers...`);
    const workerProcess = spawn('npx', [
      'tsx', 
      path.join(__dirname, 'spawn-workers.ts'),
      `--workers=${workerCount}`
    ], {
      stdio: 'inherit',
      detached: true
    });
    
    // Don't wait for the worker process to exit
    workerProcess.unref();
    
    // 4. Add failed jobs back to the queue
    console.log('Adding failed jobs to the queue...');
    
    // Make sure the queue is initialized
    if (!scrapingQueue) {
      throw new Error('Failed to initialize the scraping queue. Make sure Redis is running.');
    }
    
    // Add each job to the queue with a small delay between them
    for (let i = 0; i < failedJobs.length; i++) {
      const job = failedJobs[i];
      await scrapingQueue.add(
        'scrape-listing',
        {
          id: job.id,
          url: job.url,
          extractors: EXTRACTORS_TO_RETRY,
          fromFailedJobs: true
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      );
      
      // Log progress
      console.log(`Added job ${i + 1}/${failedJobs.length} to queue: ${job.id} (${job.url})`);
      
      // Small delay to prevent overwhelming the queue
      if (i < failedJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('All failed jobs have been added to the queue.');
    console.log('Workers are processing the jobs in the background.');
    console.log('You can monitor progress in the worker logs.');
    console.log('Press Ctrl+C to exit this script (workers will continue running).');
    
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    process.exit(1);
  }
}

// Execute the function
retryFailedJobs(); 