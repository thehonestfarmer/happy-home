import { NextResponse } from "next/server";
import { put } from '@vercel/blob';
import { ListingsData } from "../../cron/update-listings/types";
import { readListings } from "../../cron/update-listings/listings-manager";
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Use the same readListings function that other parts of the app use
    const listings = await readListings();
    if (!listings) {
      throw new Error('No listings data found');
    }

    return NextResponse.json({ 
      success: true, 
      listings 
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch listings' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { listings } = await request.json();
    let localFileSaved = false;
    
    // Save to local file first
    try {
      // Choose the right path for saving
      const allListingsPath = path.join(process.cwd(), 'public', 'all-listings.json');
      const rootListingsPath = path.join(process.cwd(), 'all-listings.json');
      
      // Try to write to both locations to ensure consistency
      await fs.writeFile(allListingsPath, JSON.stringify(listings, null, 2));
      console.log('Successfully saved listings to:', allListingsPath);
      
      try {
        // Also try to update the root file if it exists
        await fs.writeFile(rootListingsPath, JSON.stringify(listings, null, 2));
        console.log('Successfully saved listings to:', rootListingsPath);
      } catch (rootFileError) {
        console.warn('Could not save to root listings file (may not exist):', rootFileError);
      }
      
      localFileSaved = true;
    } catch (fileError) {
      console.error('Error saving listings to local file:', fileError);
    }
    
    // If in production, also upload to blob storage as a backup
    let blobUrl = null;
    if (process.env.NODE_ENV === 'production') {
      try {
        const { url } = await put(
          'listings.json',
          JSON.stringify(listings, null, 2),
          {
            access: 'public',
            addRandomSuffix: false, // Overwrite the existing file
            contentType: 'application/json',
          }
        );
        
        console.log('Successfully uploaded listings to blob storage:', url);
        blobUrl = url;
      } catch (blobError) {
        console.error('Error uploading to blob storage:', blobError);
      }
    }
    
    // Return appropriate response based on what was saved
    if (localFileSaved || blobUrl) {
      return NextResponse.json({ 
        success: true, 
        localFileSaved,
        blobUrl
      });
    } else {
      throw new Error('Failed to save listings to any storage location');
    }
  } catch (error) {
    console.error('Error updating listings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update listings' }, 
      { status: 500 }
    );
  }
} 