This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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
