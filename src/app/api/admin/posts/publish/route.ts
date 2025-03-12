import { NextRequest, NextResponse } from 'next/server';
import { publishMedia } from '@/server/instagram/api';

/**
 * Request body for publishing a carousel post to Instagram
 */
export interface PublishPostRequest {
  containerId: string;
}

/**
 * API endpoint to publish a carousel post to Instagram
 * This handles Step 3 of Instagram's 3-step process:
 * 1. Create individual media containers (done before this endpoint)
 * 2. Create a carousel container (done before this endpoint)
 * 3. Publish the carousel container using the container ID from Step 2
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as PublishPostRequest;
    
    // Validate the request
    if (!body.containerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: containerId' 
      }, { status: 400 });
    }
    
    try {
      // Step 3: Publish the carousel using the container ID
      const publishResponse = await publishMedia(body.containerId);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          postId: publishResponse.id,
          status: publishResponse.status
        }
      });
    } catch (error) {
      console.error('Error interacting with Instagram API:', error);
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to publish Instagram post'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process request'
    }, { status: 500 });
  }
} 