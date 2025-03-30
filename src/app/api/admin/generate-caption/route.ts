import { NextRequest, NextResponse } from 'next/server';
import { generateCaption } from '@/server/anthropic/api';
import { readListings } from '../../cron/update-listings/listings-manager';
import { CaptionGenerationRequest, CaptionGenerationResponse } from '@/server/anthropic/types';

export async function POST(request: NextRequest) {
  try {
    console.log('Caption generation API route called');
    
    // Verify required env variables
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not configured');
      return NextResponse.json<CaptionGenerationResponse>({ 
        success: false, 
        error: 'Anthropic API key not configured' 
      }, { status: 500 });
    }

    // Parse the request body
    const body = await request.json() as CaptionGenerationRequest;
    console.log('Request body:', { listingId: body.listingId });
    
    // Validate the request
    if (!body.listingId) {
      console.error('Missing required parameter: listingId');
      return NextResponse.json<CaptionGenerationResponse>({ 
        success: false, 
        error: 'Missing required parameter: listingId' 
      }, { status: 400 });
    }
    
    // Get the listing data
    console.log('Fetching listing data');
    const listings = await readListings(true);
    const listing = listings.newListings[body.listingId];
    
    if (!listing) {
      console.error(`Listing with ID ${body.listingId} not found`);
      return NextResponse.json<CaptionGenerationResponse>({ 
        success: false, 
        error: `Listing with ID ${body.listingId} not found` 
      }, { status: 404 });
    }
    
    console.log('Listing found, generating caption');
    
    // Generate caption and hashtags using Anthropic API
    const generatedContent = await generateCaption(listing);
    
    console.log('Caption generated successfully');
    
    return NextResponse.json<CaptionGenerationResponse>({ 
      success: true, 
      data: generatedContent
    });
  } catch (error) {
    console.error('Error generating caption:', error);
    return NextResponse.json<CaptionGenerationResponse>({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate caption'
    }, { status: 500 });
  }
}