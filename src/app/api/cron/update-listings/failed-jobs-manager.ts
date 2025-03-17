import fs from 'fs/promises';
import path from 'path';

interface FailedJob {
  id: string;
  url: string;
  failedAt: string;
  reason: string;
  retryCount: number;
}

// Use the same data directory as other files for consistency
const DATA_DIR = path.join(process.cwd(), 'src/app/api/cron/update-listings/data');
const FAILED_JOBS_PATH = path.join(DATA_DIR, 'failed-scraping-jobs.json');

/**
 * Ensures the data directory exists
 */
const ensureDataDirExists = async (): Promise<void> => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
};

/**
 * Reads the failed jobs file or creates it if it doesn't exist
 */
export const readFailedJobs = async (): Promise<FailedJob[]> => {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    // Check if file exists
    try {
      await fs.access(FAILED_JOBS_PATH);
    } catch {
      // Create file if it doesn't exist
      console.log(`Creating failed jobs file at ${FAILED_JOBS_PATH}`);
      await fs.writeFile(FAILED_JOBS_PATH, JSON.stringify([], null, 2));
      return [];
    }
    
    // Read the file
    const data = await fs.readFile(FAILED_JOBS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading failed jobs file:", error);
    return [];
  }
};

/**
 * Writes the failed jobs to the file
 */
export const writeFailedJobs = async (jobs: FailedJob[]): Promise<void> => {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    await fs.writeFile(FAILED_JOBS_PATH, JSON.stringify(jobs, null, 2));
    console.log(`Updated failed jobs file with ${jobs.length} jobs`);
  } catch (error) {
    console.error("Error writing failed jobs file:", error);
  }
};

/**
 * Adds a new failed job to the list
 */
export const addFailedJob = async (id: string, url: string, reason: string): Promise<void> => {
  try {
    console.log(`Adding failed job to tracking: ${id}`);
    const jobs = await readFailedJobs();
    
    // Check if job already exists
    const existingJobIndex = jobs.findIndex(job => job.id === id);
    
    if (existingJobIndex !== -1) {
      // Update existing job
      console.log(`Updating existing failed job: ${id} (attempt ${jobs[existingJobIndex].retryCount + 1})`);
      jobs[existingJobIndex] = {
        ...jobs[existingJobIndex],
        failedAt: new Date().toISOString(),
        reason,
        retryCount: jobs[existingJobIndex].retryCount + 1
      };
    } else {
      // Add new job
      console.log(`Recording new failed job: ${id}`);
      jobs.push({
        id,
        url,
        failedAt: new Date().toISOString(),
        reason,
        retryCount: 1
      });
    }
    
    await writeFailedJobs(jobs);
  } catch (error) {
    console.error("Error adding failed job:", error);
  }
};

/**
 * Gets all failed jobs
 */
export const getFailedJobs = async (): Promise<FailedJob[]> => {
  return await readFailedJobs();
};

/**
 * Removes a failed job from the list
 */
export const removeFailedJob = async (id: string): Promise<void> => {
  try {
    const jobs = await readFailedJobs();
    const updatedJobs = jobs.filter(job => job.id !== id);
    await writeFailedJobs(updatedJobs);
  } catch (error) {
    console.error("Error removing failed job:", error);
  }
};

/**
 * Clears all failed jobs
 */
export const clearFailedJobs = async (): Promise<void> => {
  try {
    await writeFailedJobs([]);
  } catch (error) {
    console.error("Error clearing failed jobs:", error);
  }
};

/**
 * Debug function to check if the failed jobs file exists and is accessible
 * This can be called manually to diagnose issues
 */
export const debugFailedJobsFile = async (): Promise<void> => {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    // Try to access the file
    try {
      await fs.access(FAILED_JOBS_PATH);
      console.log(`✅ Failed jobs file exists at: ${FAILED_JOBS_PATH}`);
      
      // Try to read the file
      const data = await fs.readFile(FAILED_JOBS_PATH, 'utf8');
      const jobs = JSON.parse(data);
      console.log(`✅ Successfully read failed jobs file. Contains ${jobs.length} jobs.`);
      
      // Check write permissions by writing back the same data
      await fs.writeFile(FAILED_JOBS_PATH, JSON.stringify(jobs, null, 2));
      console.log(`✅ Successfully wrote to failed jobs file.`);
      
    } catch (accessError) {
      console.log(`❌ Failed jobs file does not exist at: ${FAILED_JOBS_PATH}`);
      
      // Try to create it
      console.log(`Attempting to create failed jobs file...`);
      await fs.writeFile(FAILED_JOBS_PATH, JSON.stringify([], null, 2));
      console.log(`✅ Successfully created failed jobs file.`);
    }
  } catch (error) {
    console.error("❌ Error in debugFailedJobsFile:", error);
  }
}; 