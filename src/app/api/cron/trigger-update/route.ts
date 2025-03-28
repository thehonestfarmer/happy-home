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

    // Check for content-type to determine how to parse the body
    const contentType = request.headers.get('content-type');
    console.log('Request content-type:', contentType);

    const newListings = await scrapeAndTransformNewListings({ pages: 1 });
    console.log('newListings', newListings);
    if (newListings instanceof Error) {
      console.error('Error in scrapeAndTransformNewListings:', newListings);
      sendSlackError('Error in scrapeAndTransformNewListings', 'Trigger Update', { error: newListings instanceof Error ? newListings.message : 'Unknown error' });
      return NextResponse.json({
        success: false,
        message: newListings instanceof Error ? newListings.message : 'Unknown error'
      }, { status: 500 });
    }

    if (!newListings || Object.keys(newListings).length === 0) {
      console.log('No new listings were generated');
      sendSlackNotification('No new listings were generated', 'Trigger Update', false);
      return NextResponse.json({
        success: false,
        message: 'No new listings were generated'
      }, { status: 200 });
    }

    console.log('New listings were generated', newListings);
    const enrichedData = await initProcessListingDetails(newListings);
    const enhancedData = await translateEnrichedData(enrichedData);
    try {
      if (Object.keys(enhancedData as ListingData).length > 0) {
        await uploadListings(enhancedData as ListingData);
        sendSlackNotification('Listings updated successfully', 'Trigger Update', false);
      }
    } catch (error) {
      console.error('Error in writeListings:', error);
      sendSlackError('Error in writeListings', 'Trigger Update', { error: error instanceof Error ? error.message : 'Unknown error' });
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