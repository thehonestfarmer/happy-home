import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import { scrapePage } from './scrape-listings';
import type { ScrapedData, ListingsData } from './types';
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

function hasListingsChanged(oldListings: ListingsData, newListings: ListingsData): boolean {
  if (Object.keys(oldListings.newListings).length !== Object.keys(newListings.newListings).length) {
    console.log('Number of listings changed');
    return true;
  }

  // Deep comparison of each listing
  for (const [id, newListing] of Object.entries(newListings.newListings)) {
    const oldListing = oldListings.newListings[id];
    
    // If listing doesn't exist in old data
    if (!oldListing) {
      console.log(`New listing found: ${id}`);
      return true;
    }

    // Compare each property
    for (const [key, value] of Object.entries(newListing)) {
      if (JSON.stringify(value) !== JSON.stringify(oldListing[key])) {
        console.log(`Changes detected in listing ${id}, property: ${key}`);
        console.log('Old:', oldListing[key]);
        console.log('New:', value);
        return true;
      }
    }
  }

  console.log('No changes detected in listings');
  return false;
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
    
    // Log counts using Object.keys().length instead of .length
    console.log(
      'Existing:', Object.keys(existingListings.newListings).length,
      'New:', newListingsWithIds.addresses.length
    );

    // Check if there were any changes
    if (hasListingsChanged(existingListings, mergedListings)) {
      console.log('Uploading new listings to blob storage...');
      
      // Upload to blob storage
      const { url } = await put(
        `listings.json`,
        JSON.stringify(mergedListings, null, 2),
        {
          access: 'public',
          addRandomSuffix: false, // Overwrite the existing file
          contentType: 'application/json',
        }
      );

      console.log('Successfully uploaded new listings to:', url);

      return NextResponse.json({ 
        success: true, 
        message: 'Listings updated successfully',
        data: newListingsWithIds,
        updated: true,
        url
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'No updates needed',
      data: existingListings,
      updated: false
    });

  } catch (error) {
    console.error('Error updating listings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update listings'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const currentListings = await getCurrentListings();
    const newListings = await fetchNewListings();

    // Filter out duplicates when comparing
    const nonDuplicateCurrentListings = currentListings.filter(
      listing => !listing.isDuplicate
    );

    // Compare only with non-duplicate listings
    const updatedListings = compareAndUpdateListings(
      nonDuplicateCurrentListings, 
      newListings
    );

    // Preserve duplicate flags in final listing set
    const finalListings = updatedListings.map(listing => {
      const existingListing = currentListings.find(l => l.id === listing.id);
      if (existingListing?.isDuplicate) {
        return { ...listing, isDuplicate: true };
      }
      return listing;
    });

    await saveListings(finalListings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 