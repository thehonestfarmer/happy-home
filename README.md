# Happy Home Admin Dashboard

This project provides an admin dashboard for managing real estate listings and social media marketing.

## Features

- Manage property listings
- Create and schedule Instagram posts for properties
- Automatically select the best images for social media posts
- Generate custom price overlays for Instagram posts

## Instagram Post Management

The Instagram Posts feature allows you to:

1. Create carousel posts from property listings
2. Select images manually or automatically using AI-powered selection
3. Generate custom price overlay images
4. Schedule posts for future publication
5. View and manage scheduled posts

### Supabase Setup

The scheduled posts feature requires a Supabase database with the following setup:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Set up environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key

3. Create the `scheduled_posts` table with the following schema:

```sql
create table public.scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  scheduled_for timestamp with time zone not null,
  caption text not null,
  tags text[] null,
  images text[] not null,
  listing_id text not null,
  status text not null default 'scheduled'::text 
    check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  carousel_container_id text null,
  media_container_ids text[] null,
  error_message text null,
  user_id text not null,
  metadata jsonb null
);

-- Create index for faster queries
create index scheduled_posts_status_idx on public.scheduled_posts (status);
create index scheduled_posts_scheduled_for_idx on public.scheduled_posts (scheduled_for);

-- Enable RLS (Row Level Security)
alter table public.scheduled_posts enable row level security;

-- Create a policy for authenticated users
create policy "Users can view their own scheduled posts"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);
  
create policy "Users can insert their own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);
  
create policy "Users can update their own scheduled posts"
  on public.scheduled_posts for update
  using (auth.uid() = user_id);
  
create policy "Users can delete their own scheduled posts"
  on public.scheduled_posts for delete
  using (auth.uid() = user_id);
```

4. Set up a cron job or worker to process scheduled posts at their scheduled time

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the development server: `npm run dev`

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- TensorFlow.js (for image analysis)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Merging with batch_test_results.json

The scraper now supports merging enriched listing data with the existing `/public/batch_test_results.json` file. This ensures that all scraped and enriched listings are properly saved to the main dataset.

### Automatic Merging

When running `--batch-detail-pages`, the scraper will automatically merge the enriched data with `batch_test_results.json` after processing the listings. This behavior can be disabled with the `--no-merge` flag:

```bash
# Process detail pages and merge with batch_test_results.json (default)
node src/app/api/cron/update-listings/scrape-listings.ts --batch-detail-pages

# Process detail pages but skip merging
node src/app/api/cron/update-listings/scrape-listings.ts --batch-detail-pages --no-merge
```

### Manual Merging

You can run just the merge process without scraping:

```bash
# Run the merge process only
node src/app/api/cron/update-listings/scrape-listings.ts --merge-only

# Or run the merge function directly from the TS file
ts-node -e "import { mergeListings } from './src/app/api/cron/update-listings/merge-listings'; mergeListings();"
```

### Full Workflow with Merging

For a complete scraping, enrichment, translation, and merging workflow:

```bash
AUTO_ENRICH=true AUTO_TRANSLATE=true node src/app/api/cron/update-listings/scrape-listings.ts --init
```

This command will:
1. Scrape new listings
2. Enrich them with details
3. Translate all fields
4. Merge the results with `batch_test_results.json`
