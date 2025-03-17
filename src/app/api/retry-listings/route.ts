import { NextResponse } from 'next/server';
import { scrapingQueue } from '@/lib/queue';

export async function GET() {
    try {
        if (!scrapingQueue) {
            throw new Error('Queue not initialized');
        }

        // Get all failed jobs
        const failedJobs = await scrapingQueue.getFailed();
        
        if (failedJobs.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No failed jobs found to retry'
            });
        }

        console.log(`Found ${failedJobs.length} failed jobs to retry`);

        // Retry each failed job
        const retryPromises = failedJobs.map(async (job) => {
            try {
                await job.retry();
                console.log(`✓ Retried job ${job.id}`);
                return { id: job.id, status: 'retried' };
            } catch (error) {
                console.error(`✗ Failed to retry job ${job.id}:`, 
                    error instanceof Error ? error.message : 'Unknown error'
                );
                return { id: job.id, status: 'retry_failed' };
            }
        });

        const results = await Promise.all(retryPromises);

        const retriedCount = results.filter(r => r.status === 'retried').length;
        const failedCount = results.filter(r => r.status === 'retry_failed').length;

        return NextResponse.json({
            success: true,
            message: `Retried ${retriedCount} jobs, ${failedCount} retry failures`,
            details: results
        });

    } catch (error) {
        console.error('Error retrying jobs:', 
            error instanceof Error ? error.message : 'Unknown error'
        );
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retry jobs'
        }, { status: 500 });
    }
} 