import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// Comment out Redis-related imports for production
// import { Queue } from "bullmq";
// import { initRedisConnection } from "@/lib/scraper/utils/redis";

// Helper function to check if we're in production environment
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("status", "failed")
      .order("completed_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Transform the data to match the expected format in the UI
    const transformedJobs = data.map((job) => ({
      id: job.id,
      url: job.target_url,
      failedAt: job.completed_at,
      reason: job.error_message || "Unknown error",
      retryCount: job.attempts,
    }));

    return NextResponse.json({ jobs: transformedJobs });
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

    // Get the failed jobs from the database
    const { data: failedJobs, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .in("id", jobIds)
      .eq("status", "failed");

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Initialize Redis connection
    // const connection = await initRedisConnection();
    
    // Create or get the detail queue
    // const detailQueue = new Queue("detail-extraction", { connection });

    // Re-queue the failed jobs
    const retryCounts: Record<string, number> = {};
    for (const job of failedJobs) {
      // Add job back to the queue with the original data
      // await detailQueue.add(
      //   `retry-${job.job_id}`,
      //   {
      //     listingId: job.listing_id,
      //     targetUrl: job.target_url,
      //     retryCount: job.attempts + 1,
      //   },
      //   {
      //     attempts: 3, // Reset attempts
      //     backoff: {
      //       type: "exponential",
      //       delay: 1000, // 1 second initial delay
      //     },
      //   }
      // );

      // Update job status in database
      await supabase
        .from("scrape_jobs")
        .update({
          status: "pending",
          attempts: job.attempts + 1,
          error_message: null,
        })
        .eq("id", job.id);

      retryCounts[job.id] = job.attempts + 1;
    }

    return NextResponse.json({
      message: `${failedJobs.length} jobs requeued with ${workerCount} workers`,
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
    // Update all failed jobs to have a "cleared" status
    const { error } = await supabase
      .from("scrape_jobs")
      .update({ status: "cleared" })
      .eq("status", "failed");

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return NextResponse.json({ message: "All failed jobs cleared" });
  } catch (error) {
    console.error("Failed to clear jobs:", error);
    return NextResponse.json(
      { error: "Failed to clear failed jobs" },
      { status: 500 }
    );
  }
} 