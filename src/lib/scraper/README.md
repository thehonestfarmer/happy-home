# Real Estate Scraper System

A modular, functional programming-based web scraping system for real estate listings, designed to run as a serverless application on Vercel with BullMQ for job processing.

## System Architecture

This scraper follows a functional programming approach with these key components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel Cron    │────▶│  Scraper Core   │────▶│  BullMQ Queue   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │  Detail Page    │
                        │    Supabase     │     │   Processors    │
                        │    Database     │     │                 │
                        └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │   JSON Backup   │
                                                │                 │
                                                └─────────────────┘
```

## Key Features

- **Functional Programming Approach**: Pure functions, composable extraction pipelines
- **Modular Architecture**: Single-responsibility extractors for each data field
- **Error Handling & Resilience**: Specialized timeout handling with exponential backoff
- **JSON Backup System**: Redundant storage in Vercel Blob Storage
- **Admin Dashboard**: Monitoring and retry capabilities for failed jobs

## Getting Started

### Prerequisites

- Node.js 18+
- Redis (for BullMQ)
- Supabase account and credentials
- Vercel account (for deployment and Vercel Blob Storage)

### Environment Variables

Create a `.env.local` file with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=your-redis-url

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your-blob-token
```

### Starting Workers

To start the worker processes with default settings:

```bash
npm run start:workers
```

With custom concurrency settings:

```bash
npm run start:workers -- --listingConcurrency=2 --detailConcurrency=5
```

For development with automatic restart on code changes:

```bash
npm run start:workers:dev
```

## Usage

### Triggering a Scrape

```typescript
import { startNewScrape } from '@/lib/scraper';

// Start a scrape with default URL
const result = await startNewScrape();

// Start a scrape with specific URL
const result = await startNewScrape('https://example.com/listings');
```

### Managing Failed Jobs

```typescript
import { 
  getFailedJobs, 
  retryFailedJobs, 
  clearFailedJobs 
} from '@/lib/scraper';

// Get all failed jobs
const failedJobs = await getFailedJobs();

// Retry specific jobs by ID
await retryFailedJobs(['job-id-1', 'job-id-2']);

// Retry all failed jobs
await retryFailedJobs();

// Clear all failed jobs
await clearFailedJobs();
```

### Getting Scraper Status

```typescript
import { getScraperStatus } from '@/lib/scraper';

const status = await getScraperStatus();
console.log(status);
// {
//   activeJobs: 2,
//   waitingJobs: 5,
//   completedJobs: 120,
//   failedJobs: 3,
//   lastRun: '2023-05-20T10:30:15.123Z',
//   queueStatus: 'active'
// }
```

## Testing

Run the test suite:

```bash
npm run test:scraper
```

Test extractors individually:

```bash
npm run test:extractors:cjs
```

## Directory Structure

- `admin/` - Admin functionality for job management
- `config/` - Configuration files
- `extractors/` - Pure functions for data extraction
- `queue/` - Queue definitions and worker implementation
- `storage/` - Database and JSON backup functionality
- `tests/` - Test fixtures and test implementations
- `utils/` - Shared utilities and helpers

## Implementing New Extractors

Create a new file in `src/lib/scraper/extractors`:

```typescript
import { pipe } from 'fp-ts/function';
import { Option, some, none } from 'fp-ts/Option';
import { load } from 'cheerio';

/**
 * Extract property price from HTML
 * 
 * @param html HTML content from property listing
 * @returns Option with price in millions of JPY or none if not found
 */
export const extractPrice = (html: string): Option<number> => {
  try {
    const $ = load(html);
    const priceText = $('.property-price').text().trim();
    
    // Parse JPY format (e.g., "6930万円")
    const match = priceText.match(/(\d+)万円/);
    if (!match) return none;
    
    // Convert to millions (e.g., 6930万円 -> 69.3 million)
    const price = parseInt(match[1], 10) / 100;
    return some(price);
  } catch (e) {
    return none;
  }
};
```

## Error Handling

The system implements specialized error handling:

- Network timeouts trigger exponential backoff retry
- Parser errors are logged and flagged for admin review
- Deleted listings are detected and marked accordingly

## Contributors

- Your Name - Initial implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details. 