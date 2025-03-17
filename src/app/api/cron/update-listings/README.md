# Parallel Scraping System with BullMQ

This directory contains a parallel scraping system implemented using BullMQ, a Redis-based queue for Node.js. The system allows for efficient processing of multiple listing scraping operations concurrently, with automatic retries for failed jobs.

## Prerequisites

- Node.js 16+ installed
- Redis server running (required for BullMQ)
- Project dependencies installed (`npm install` or `yarn install`)

## System Components

1. **Queue Setup** (`src/lib/queue.ts`): Configures the BullMQ queue
2. **Process Manager** (`process-updated-listings.ts`): Handles extracting listings from JSON files and adding them to the queue
3. **Worker** (`worker.ts`): Processes jobs from the queue, performing the actual scraping

## Redis Setup

This project uses BullMQ with a local Redis instance for job queue management. 

1. Install Redis locally: 
   - On macOS: `brew install redis`
   - On Linux: `sudo apt-get install redis-server`
   - On Windows: Download from [Redis Windows](https://github.com/microsoftarchive/redis/releases)

2. Start your local Redis server:
   - macOS/Linux: `redis-server`
   - Windows: Start the Redis service

The application is configured to connect to Redis on localhost:6379. No authentication is required for local development.

## File Storage

Instead of using cloud storage, the application now stores all data locally:

- The primary data store is `all-listings.json` located in the `data` directory
- New scraped data is processed and merged directly into this file
- When the API loads, it reads from this file to serve listing data

## Data Storage

The system maintains a key file to store listing data:

**all-listings.json**: The primary data store, a "poor man's database" that contains all listings
   - This file serves as the source of truth for the application
   - Located at the project root directory
   - Updated whenever new data is scraped or listings are processed
   - Contains all property data including extracted tags, descriptions, coordinates and other metadata

The system ensures that any new properties obtained from extractors are merged into the corresponding listing in all-listings.json if the listing exists.

## How to Run the System

### Option 1: All-in-One Script (Recommended)

The system includes a comprehensive script that provides a menu-based interface for all scraping operations:

```bash
# Make the script executable
chmod +x src/app/api/cron/update-listings/run-scraping.sh

# Run the interactive menu
./src/app/api/cron/update-listings/run-scraping.sh

# Or run specific actions directly
./src/app/api/cron/update-listings/run-scraping.sh --action=workers --workers=5
```

Available actions:
- `workers`: Start worker processes only
- `scrape`: Start scraping process (requires workers to be running)
- `retry`: Retry all failed jobs
- `missing`: Find listings with missing fields
- `all`: Start workers and scraping process together

The interactive menu provides additional options and a user-friendly interface.

### Option 2: Manual Setup

If you prefer to run the components individually, follow these steps:

#### Step 1: Start Redis Server

Redis is required for BullMQ to function. If you don't have Redis installed:

```bash
# MacOS with Homebrew
brew install redis
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Windows
# Install using Windows Subsystem for Linux (WSL) or Redis Windows port
```

Verify Redis is running:

```bash
redis-cli ping
# Should return PONG
```

#### Step 2: Run the Worker Process

You have two options for running workers:

##### Option A: Run a Single Worker

```bash
# From the project root directory
npx tsx src/app/api/cron/update-listings/start-worker.ts
```

##### Option B: Run Multiple Workers (Recommended)

The system includes a worker supervisor that can spawn and manage multiple worker processes:

```bash
# Make the script executable
chmod +x src/app/api/cron/update-listings/run-workers.sh

# Run with default number of workers (3)
./src/app/api/cron/update-listings/run-workers.sh

# Or specify a custom number of workers
./src/app/api/cron/update-listings/run-workers.sh --workers=5
```

The worker supervisor will:
- Spawn the specified number of worker processes
- Monitor them and restart any that crash
- Handle graceful shutdown when you press Ctrl+C

You should see output indicating that the workers have started successfully:
```
[Supervisor] Starting 3 workers...
[Supervisor] All 3 workers started successfully.
[Worker #1] Worker initialized and ready to process jobs
[Worker #2] Worker initialized and ready to process jobs
[Worker #3] Worker initialized and ready to process jobs
```

#### Step 3: Start the Scraping Process

To initiate the scraping and add jobs to the queue, you can either:

##### Option A: Call the Function Directly

Create a script file (e.g., `start-scraping.ts`) with the following content:

```typescript
import { processListingsJob } from './src/app/api/cron/update-listings/process-updated-listings';

// Path to your listings JSON file
const inputFilePath = 'path/to/your/all-listings.json';

// Start the scraping process
processListingsJob(inputFilePath)
  .then(() => console.log('Scraping process initiated successfully'))
  .catch(err => console.error('Error starting scraping process:', err));
```

Run the script:
```bash
npx tsx start-scraping.ts
```

##### Option B: Use the API Endpoint

Make a POST request to the update-listings API endpoint:

```bash
curl -X POST http://localhost:3000/api/cron/update-listings -H "x-admin-token: admin-ui"
```

Or from the Admin UI, use the "Start Scraping" button on the Scraper page.

## Retrying Failed Jobs

The system provides multiple ways to retry failed jobs:

### Option A: Using the Admin UI

1. Navigate to the Admin UI at `/admin/scraper`
2. Select the failed jobs you want to retry
3. Set the number of workers you want to use
4. Click "Retry Selected"

This will:
- Spawn the specified number of worker processes
- Add the selected jobs to the queue
- Process them in parallel

### Option B: Using the Command Line

A script is provided to retry failed jobs from the command line:

```bash
# Make the script executable
chmod +x src/app/api/cron/update-listings/retry-failed-jobs.sh

# Run with default number of workers (3)
./src/app/api/cron/update-listings/retry-failed-jobs.sh

# Or specify a custom number of workers
./src/app/api/cron/update-listings/retry-failed-jobs.sh --workers=5
```

This will:
1. Read all failed jobs from the failed jobs file
2. Spawn the specified number of worker processes
3. Add all failed jobs to the queue for processing

## Understanding the Process Flow

1. `processListingsJob` reads the input JSON file containing listings
2. It adds each listing to the BullMQ queue as a separate job
3. The worker process(es) pick up jobs from the queue and process them in parallel
4. Each job loads a listing page and extracts data using the configured extractors
5. Successful jobs update the listing data and are removed from the queue
6. Failed jobs are automatically retried according to the configured retry policy

## Configuring the System

### Queue Concurrency

You can adjust the concurrency in the worker.ts file:

```typescript
// Example: Process 5 jobs concurrently
scrapingQueue.process('scrape-listing', 5, async (job) => {
  // Job processing logic
});
```

### Retry Policy

Modify the retry settings in process-updated-listings.ts:

```typescript
const job = await queue.add('scrape-listing', {
  // job data
}, {
  attempts: 3,              // Number of attempts
  backoff: {
    type: 'exponential',    // 'fixed' or 'exponential'
    delay: 2000             // Base delay in ms
  }
});
```

## Troubleshooting

### Queue Not Connecting
- Ensure Redis is running
- Check Redis connection configuration in queue.ts
- Verify network connectivity if using remote Redis

### Jobs Not Processing
- Check worker logs for errors
- Ensure worker is running and connected to the same Redis instance
- Verify job data format is correct

### Failed Jobs
- Check the failed jobs in the Admin UI
- Analyze logs for specific error messages
- Consider updating extraction logic for problematic sites

## Monitoring

You can monitor the queue using:

1. The Admin UI "Scraper" page
2. Redis CLI commands like `KEYS bull:listing-scraping:*` and `LLEN bull:listing-scraping:wait`
3. BullMQ UI packages like `@bull-board/ui` if you integrate them

## Cleaning Up

To stop the system:

1. Stop the worker process(es) with Ctrl+C
2. (Optional) Clear the queue and job data with Redis commands or API endpoint
3. Stop Redis if no longer needed

## Advanced Usage

For more advanced use cases, refer to:
- [BullMQ documentation](https://docs.bullmq.io/)
- The source code in `worker.ts` and `process-updated-listings.ts`

## Utility Scripts

### Find Listings with Missing Fields

A utility script is provided to find listings that are missing required fields like "tags" or "latLong". This is particularly useful when:

1. Preparing for database migration to PostgreSQL
2. Needing to reprocess listings that failed to extract all required data
3. Fixing data consistency issues

To run the script:

```bash
# Navigate to the script directory
cd src/app/api/cron/update-listings

# Make the script executable
chmod +x find-missing-fields.sh

# Run the script
./find-missing-fields.sh
```

This will:
1. Scan all listings in `all-listings.json`
2. Identify those missing "tags" or "latLong" fields
3. Add them to the failed jobs list (`failed-scraping-jobs.json`)
4. Display a summary of the results

You can then go to the Admin UI at `/admin/scraper` to see these jobs and retry them 