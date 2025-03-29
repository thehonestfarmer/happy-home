import { NextResponse } from 'next/server';
import { scrapeAndTransformNewListings } from '../update-listings/scrape-listings';
import { sendSlackError, sendSlackNotification } from '@/server/slack/notifications';
import { initProcessListingDetails, translateEnrichedData } from '../update-listings/scrape-listings';
import { readListings, uploadListings, mergeListings  } from '../update-listings/listings-manager';
import { updateCoords } from '../update-coords/route';
import { ListingData, ListingsData } from '../update-listings/types';
/**
 * This route handler is designed to be called by Vercel Cron Jobs
 * It verifies the Vercel signature (if present) and then calls the update-listings
 * endpoint with the proper authentication
 */

export async function GET(request: Request) {
  console.log('Vercel Cron trigger received at', new Date().toISOString());
  sendSlackNotification(':robot_face: Starting trigger-update cron job', ':gun: Trigger Update', 'info');

  try {
    const cronSignature = request.headers.get('x-vercel-cron');
    const cronSecret = process.env.VERCEL_CRON_SECRET;

    if (cronSecret && (!cronSignature || cronSignature !== cronSecret)) {
      console.error('Invalid cron signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the URL to get query parameters
    const url = new URL(request.url);
    let pages = 1; // Default to 1 page (only check for recently added)
    
    // Get 'pages' query parameter
    const pagesParam = url.searchParams.get('pages');

    if (pagesParam !== null) {
      const parsedPages = parseInt(pagesParam, 10);
      
      // If pages=0 and in development mode, set to 0 (all pages)
      // This is a special case for development testing
      if (parsedPages === 0 && process.env.NODE_ENV === 'development') {
        // NOTE: We should change this confusing interface when migrating to a VPS.
        // Serverless environment is constrained to resolve in 90 seconds,
        // and crawling all pages and visiting them will take longer.
        pages = 0; // 0 means all pages in the scraper function
        console.log('Development mode: Scraping all pages');
      } else {
        // Otherwise use the provided value
        pages = parsedPages;
      }
    }

    console.log(`Scraping ${pages === 0 ? 'all' : pages} page(s) for new listings`);
    const newListings = await scrapeAndTransformNewListings({ pages });

    if (newListings instanceof Error) {
      console.error('Error in scrapeAndTransformNewListings:', newListings);
      sendSlackError(':interrobang:  Error in scrapeAndTransformNewListings', ':gun: Trigger Update', { error: newListings instanceof Error ? newListings.message : 'Unknown error' });
      return NextResponse.json({
        success: false,
        message: newListings instanceof Error ? newListings.message : 'Unknown error'
      }, { status: 500 });
    }

    if (!newListings || Object.keys(newListings).length === 0) {
      sendSlackNotification(':jar:  No new listings were generated', ':gun: Trigger Update', 'warning');
      return NextResponse.json({
        success: false,
        message: 'No new listings were generated'
      }, { status: 200 });
    }

    try {
      const enrichedData = await initProcessListingDetails(newListings);
      const enhancedData = await translateEnrichedData(enrichedData);
      if (Object.keys(enhancedData as ListingData).length > 0) {
        const currentListings = await readListings(true);

        console.log(`Current listings: ${Object.keys(currentListings).length}`);
        const updatedListings = await updateCoords(enhancedData as ListingData);
        await uploadListings({ ...updatedListings, ...currentListings });
        sendSlackNotification(`::white_check_mark: :  Listings updated successfully\n\n${Object.keys(enhancedData as ListingData).length} listings added`, ':gun: Trigger Update', 'success');
      }
    } catch (error) {
      console.error('Error in writeListings:', error);
      sendSlackError(':interrobang:  Error in uploadListings', ':gun: Trigger Update', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    return NextResponse.json({
      success: true,
      message: "Listings updated successfully"
    });
  } catch (error) {
    console.error('Error in trigger-update route:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'; 