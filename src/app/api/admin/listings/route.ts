import { NextResponse } from "next/server";
import { put } from '@vercel/blob';
import { ListingsData } from "../../cron/update-listings/types";
import { readListings } from "../../cron/update-listings/listings-manager";

export async function GET() {
  try {
    // Use the same readListings function that other parts of the app use
    const listings = await readListings();
    if (!listings) {
      throw new Error('No listings data found');
    }

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch listings' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const listings = await request.json();
    
    // Upload to blob storage
    const { url } = await put(
      'listings.json',
      JSON.stringify(listings, null, 2),
      {
        access: 'public',
        addRandomSuffix: false, // Overwrite the existing file
        contentType: 'application/json',
      }
    );

    console.log('Successfully uploaded listings to:', url);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error updating listings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update listings' }, 
      { status: 500 }
    );
  }
} 