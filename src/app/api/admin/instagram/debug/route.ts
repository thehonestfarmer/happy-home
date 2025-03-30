import { NextRequest, NextResponse } from 'next/server';
import { validateImageUrl } from '@/server/instagram/api';
import { readListings } from '../../../cron/update-listings/listings-manager';

interface DebugResponse {
  token: boolean;
  accountId: boolean;
  sampleImageUrl?: {
    url: string;
    valid: boolean;
    error?: string;
  };
  error?: string;
  details?: string;
}

/**
 * Endpoint to diagnose Instagram API connection issues
 */
export async function POST(request: NextRequest) {
  const response: DebugResponse = {
    token: false,
    accountId: false
  };
  
  try {
    // Check access token
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({
        ...response,
        error: 'Instagram access token is missing in environment variables'
      });
    }
    
    response.token = true;
    
    // Check account ID
    const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841470115210225';
    if (!accountId) {
      return NextResponse.json({
        ...response,
        error: 'Instagram business account ID is missing'
      });
    }
    
    response.accountId = true;
    
    // Try to get a sample image URL to validate
    try {
      const listings = await readListings(true);
      const listingIds = Object.keys(listings.newListings || {});
      
      if (listingIds.length > 0) {
        const firstListing = listings.newListings[listingIds[0]];
        
        if (firstListing.listingImages && firstListing.listingImages.length > 0) {
          const sampleUrl = firstListing.listingImages[0];
          const validation = await validateImageUrl(sampleUrl);
          
          response.sampleImageUrl = {
            url: sampleUrl,
            valid: validation.valid,
            error: validation.error
          };
        }
      }
    } catch (listingError) {
      console.error('Error checking sample image:', listingError);
      // Continue with other checks even if this fails
    }
    
    // Make a simple request to the Instagram API to check token validity
    try {
      const apiUrl = `https://graph.instagram.com/v22.0/${accountId}?fields=id,username&access_token=${accessToken}`;
      const apiResponse = await fetch(apiUrl);
      const data = await apiResponse.json();
      
      if (apiResponse.ok) {
        return NextResponse.json({
          ...response,
          details: `Connection successful. Account username: ${data.username || 'Unknown'}`
        });
      } else {
        return NextResponse.json({
          ...response,
          error: data.error?.message || 'Unknown API error',
          details: JSON.stringify(data, null, 2)
        });
      }
    } catch (apiError) {
      return NextResponse.json({
        ...response,
        error: apiError instanceof Error ? apiError.message : 'Failed to connect to Instagram API',
      });
    }
  } catch (error) {
    return NextResponse.json({
      token: false,
      accountId: false,
      error: error instanceof Error ? error.message : 'Unknown error checking Instagram configuration'
    });
  }
} 