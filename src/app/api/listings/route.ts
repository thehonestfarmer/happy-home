import { NextResponse } from 'next/server';
import { readListings } from '../cron/update-listings/listings-manager';

export async function GET() {
  try {
    const listings = await readListings();
    
    return NextResponse.json({ 
      success: true,
      data: listings
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch listings'
    }, { status: 500 });
  }
} 