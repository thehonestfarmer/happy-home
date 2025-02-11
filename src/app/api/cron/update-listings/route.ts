import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { scrapePage } from './scrape-listings';
import type { ScrapedData } from './types';
import { readListings, mergeListings } from './listings-manager';

function validateScrapedData(data: any): data is ScrapedData {
  if (!data) return false;
  
  console.log('Validating scraped data structure:');
  console.log('addresses:', Array.isArray(data.addresses));
  console.log('tags:', Array.isArray(data.tags));
  console.log('Sample tags:', data.tags[0]);
  
  return (
    Array.isArray(data.addresses) &&
    Array.isArray(data.tags) &&
    Array.isArray(data.listingDetail) &&
    Array.isArray(data.prices) &&
    Array.isArray(data.layout) &&
    Array.isArray(data.buildSqMeters) &&
    Array.isArray(data.landSqMeters)
  );
}

export async function POST(request: Request) {
  try {
    // Add authorization check for cron jobs
    const authHeader = request.headers.get('authorization');
    console.log(authHeader, process.env.CRON_SECRET_KEY);
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Scrape the listings
    console.log('Scraping listings...');
    const scrapedData = await scrapePage();
    if (!scrapedData) {
      throw new Error('Failed to scrape listings');
    }

    if (!validateScrapedData(scrapedData)) {
      throw new Error('Invalid scraped data structure');
    }

    // Read existing listings
    const existingListings = await readListings();

    // Add UUIDs to new listings
    const newListingsWithIds = {
      ...scrapedData,
      ids: Array(scrapedData.addresses.length).fill(null).map(() => uuidv4())
    };

    // Merge listings
    const mergedListings = await mergeListings(existingListings, newListingsWithIds);
    console.log(existingListings.newListings.length, newListingsWithIds.ids.length);
    console.log(mergedListings.newListings.length);

    return NextResponse.json({ 
      success: true, 
      message: 'Listings updated successfully',
      data: mergedListings
    });

  } catch (error) {
    console.error('Error updating listings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update listings'
    }, { status: 500 });
  }
} 