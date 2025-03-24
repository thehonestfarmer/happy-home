import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define the FailedJob interface to match the structure in the JSON file
interface FailedJob {
  id: string;
  url: string;
  failedAt: string;
  reason: string;
  retryCount: number;
}

// Path to the failed jobs JSON file
const FAILED_JOBS_PATH = path.join(process.cwd(), "src/app/api/cron/update-listings/data/failed-scraping-jobs.json");

// Helper function to check if we're in production environment
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// Helper function to read the failed jobs from the JSON file
const readFailedJobs = (): FailedJob[] => {
  try {
    if (!fs.existsSync(FAILED_JOBS_PATH)) {
      // Create an empty array if the file doesn't exist
      fs.writeFileSync(FAILED_JOBS_PATH, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    
    const fileContent = fs.readFileSync(FAILED_JOBS_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading failed jobs file:", error);
    return [];
  }
};

// Helper function to write the failed jobs to the JSON file
const writeFailedJobs = (jobs: FailedJob[]) => {
  try {
    // Ensure the directory exists
    const dir = path.dirname(FAILED_JOBS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(FAILED_JOBS_PATH, JSON.stringify(jobs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing failed jobs file:", error);
    return false;
  }
};

// GET handler to fetch failed jobs
export async function GET() {
  // In production, just return an empty array of jobs
  if (isProduction()) {
    console.log('Failed jobs API disabled in production environment');
    return NextResponse.json({ 
      jobs: [],
      message: 'Scraping functionality disabled in production' 
    });
  }

  try {
    const failedJobs = readFailedJobs();
    
    return NextResponse.json({ jobs: failedJobs });
  } catch (error) {
    console.error("Failed to fetch failed jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch failed jobs" },
      { status: 500 }
    );
  }
}

// POST handler to retry failed jobs
export async function POST(request: Request) {
  // Skip in production environment
  if (isProduction()) {
    console.log('Retry failed jobs API disabled in production environment');
    return NextResponse.json({ 
      message: 'Scraping functionality disabled in production',
      retriedJobs: [] 
    });
  }

  try {
    const { jobIds, workerCount = 3 } = await request.json();

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: "No job IDs provided" },
        { status: 400 }
      );
    }

    // Get all failed jobs
    const failedJobs = readFailedJobs();
    
    // Filter jobs to retry
    const jobsToRetry = failedJobs.filter((job: FailedJob) => jobIds.includes(job.id));
    
    // Update retry count for jobs being retried
    const retryCounts: Record<string, number> = {};
    jobsToRetry.forEach((job: FailedJob) => {
      job.retryCount = (job.retryCount || 0) + 1;
      retryCounts[job.id] = job.retryCount;
    });
    
    // Remove retried jobs from the failed jobs list
    const updatedFailedJobs = failedJobs.filter((job: FailedJob) => !jobIds.includes(job.id));
    
    // Write the updated jobs back to the file
    writeFailedJobs(updatedFailedJobs);

    // Here you would add the jobs back to your processing queue
    // For now we just simulate that by removing them from the failed jobs list
    
    return NextResponse.json({
      message: `${jobsToRetry.length} jobs requeued with ${workerCount} workers`,
      retriedJobs: retryCounts,
    });
  } catch (error) {
    console.error("Failed to retry jobs:", error);
    return NextResponse.json(
      { error: "Failed to retry jobs" },
      { status: 500 }
    );
  }
}

// DELETE handler to clear all failed jobs
export async function DELETE() {
  try {
    // Clear all failed jobs by writing an empty array
    writeFailedJobs([]);

    return NextResponse.json({ message: "All failed jobs cleared" });
  } catch (error) {
    console.error("Failed to clear jobs:", error);
    return NextResponse.json(
      { error: "Failed to clear failed jobs" },
      { status: 500 }
    );
  }
} 