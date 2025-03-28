import { NextResponse } from 'next/server';
import { scrapeAndTransformNewListings } from '../update-listings/scrape-listings';
import { sendSlackError, sendSlackNotification } from '@/server/slack/notifications';
import { initProcessListingDetails, translateEnrichedData } from '../update-listings/scrape-listings';
import { uploadListings } from '../update-listings/listings-manager';
/**
 * This route handler is designed to be called by Vercel Cron Jobs
 * It verifies the Vercel signature (if present) and then calls the update-listings
 * endpoint with the proper authentication
 */

export async function GET(request: Request) {
  console.log('Vercel Cron trigger received at', new Date().toISOString());
  sendSlackNotification(':robot_face: Starting trigger-update cron job', 'Trigger Update', true);

  try {
    // Optional: Verify this request is from Vercel Cron using the Cron Secret
    // This adds another layer of security
    const cronSignature = request.headers.get('x-vercel-cron');
    const cronSecret = process.env.VERCEL_CRON_SECRET;

    if (cronSecret && (!cronSignature || cronSignature !== cronSecret)) {
      console.error('Invalid cron signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the API key from environment variables
    const apiKey = process.env.CRON_API_KEY;
    if (!apiKey) {
      console.error('CRON_API_KEY not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // only check the first page for new listings
    const newListings = await scrapeAndTransformNewListings({ pages: 1 });

    if (newListings instanceof Error) {
      console.error('Error in scrapeAndTransformNewListings:', newListings);
      sendSlackError(':interrobang:  Error in scrapeAndTransformNewListings', 'Trigger Update', { error: newListings instanceof Error ? newListings.message : 'Unknown error' });
      return NextResponse.json({
        success: false,
        message: newListings instanceof Error ? newListings.message : 'Unknown error'
      }, { status: 500 });
    }

    if (!newListings || Object.keys(newListings).length === 0) {
      sendSlackNotification(':jar:  No new listings were generated', 'Trigger Update', false);
      return NextResponse.json({
        success: false,
        message: 'No new listings were generated'
      }, { status: 200 });
    }

    try {
      const enrichedData = await initProcessListingDetails(newListings);
      const enhancedData = await translateEnrichedData(enrichedData);
      if (Object.keys(enhancedData as ListingData).length > 0) {
        await uploadListings(enhancedData as ListingData);
        sendSlackNotification(`:check_mark:  Listings updated successfully\n\n${Object.keys(enhancedData as ListingData).length} listings added`, 'Trigger Update', false);
      }
    } catch (error) {
      console.error('Error in writeListings:', error);
      sendSlackError(':interrobang:  Error in uploadListings', 'Trigger Update', { error: error instanceof Error ? error.message : 'Unknown error' });
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