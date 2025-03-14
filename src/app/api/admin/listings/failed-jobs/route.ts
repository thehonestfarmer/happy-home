import { NextResponse } from "next/server";
import { getFailedJobs, removeFailedJob, clearFailedJobs } from "../../../cron/update-listings/failed-jobs-manager";
import { processListingsJob } from "../../../cron/update-listings/process-updated-listings";

export const EXTRACTORS_TO_RETRY = [
  'checkIfListingExists',
  'extractAndTranslateTags',
]

// GET: Retrieve the list of failed jobs
export async function GET() {
  try {
    const failedJobs = await getFailedJobs();
    return NextResponse.json({ jobs: failedJobs });
  } catch (error) {
    console.error('Error fetching failed jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch failed jobs' }, 
      { status: 500 }
    );
  }
}

// POST: Retry specific jobs
export async function POST(request: Request) {
  try {
    const { jobIds, workerCount } = await request.json();
    
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Expected an array of job IDs' }, 
        { status: 400 }
      );
    }
    
    // Get all failed jobs
    const failedJobs = await getFailedJobs();
    
    // Filter for the requested jobs
    const jobsToRetry = failedJobs.filter(job => jobIds.includes(job.id));
    
    if (jobsToRetry.length === 0) {
      return NextResponse.json(
        { error: 'No matching jobs found' }, 
        { status: 404 }
      );
    }
    
    // Process the jobs in a non-blocking way with the specified worker count
    const processPromise = processRetryJobs(jobsToRetry, workerCount);
    
    // Return immediately with job count that will be retried
    return NextResponse.json({
      message: `Retrying ${jobsToRetry.length} jobs with ${workerCount || 'default'} workers`,
      jobsBeingRetried: jobsToRetry.map(job => ({
        id: job.id,
        url: job.url
      }))
    });
    
  } catch (error) {
    console.error('Error retrying jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry jobs' },
      { status: 500 }
    );
  }
}

// DELETE: Clear failed jobs list
export async function DELETE() {
  try {
    await clearFailedJobs();
    return NextResponse.json({ success: true, message: 'All failed jobs cleared' });
  } catch (error) {
    console.error('Error clearing failed jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear failed jobs' },
      { status: 500 }
    );
  }
}

// Helper function to process retry jobs in the background
async function processRetryJobs(jobs: { id: string; url: string }[], workerCount?: number) {
  try {
    console.log(`Starting retry process for ${jobs.length} jobs${workerCount ? ` with ${workerCount} workers` : ''}`);
    
    const fs = require('fs/promises');
    const path = require('path');
    const { spawn } = require('child_process');
    const { scrapingQueue } = require('@/lib/queue');
    
    // Ensure the queue is initialized
    if (!scrapingQueue) {
      throw new Error('Failed to initialize the scraping queue. Make sure Redis is running.');
    }
    
    // 1. Spawn workers in a separate process if worker count is specified
    if (workerCount && workerCount > 0) {
      console.log(`Spawning ${workerCount} workers...`);
      const workerProcess = spawn('npx', [
        'tsx', 
        path.join(process.cwd(), 'src/app/api/cron/update-listings/spawn-workers.ts'),
        `--workers=${workerCount}`
      ], {
        stdio: 'inherit',
        detached: true
      });
      
      // Don't wait for the worker process to exit
      workerProcess.unref();
    }
    
    // 2. Add jobs to the queue
    console.log('Adding jobs to the queue...');
    
    // Add each job to the queue with a small delay between them
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
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
      console.log(`Added job ${i + 1}/${jobs.length} to queue: ${job.id} (${job.url})`);
      
      // Small delay to prevent overwhelming the queue
      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Retry process initiated for ${jobs.length} jobs`);
    console.log('NOTE: Jobs will remain in the failed jobs list until they are successfully processed');
    console.log('      Jobs will only be removed if latLong values are successfully extracted');
    
    // REMOVED: We no longer automatically remove jobs from the failed list here
    // Instead, the worker.ts file will handle removing successfully processed jobs
    
  } catch (error) {
    console.error('Error in retry process:', error);
  }
} 