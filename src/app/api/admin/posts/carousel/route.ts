import { NextRequest, NextResponse } from 'next/server';
import { createCarouselContainer } from '@/server/instagram/api';

/**
 * Request body for creating a carousel container
 */
export interface CreateCarouselRequest {
  containerIds: string[];
  caption: string;
}

/**
 * API endpoint to create an Instagram carousel container
 * This handles Step 2 of Instagram's 3-step process:
 * 1. Create individual media containers (handled by /api/admin/instagram?containers=true)
 * 2. Create a carousel container (this endpoint)
 * 3. Publish the carousel container (handled by /api/admin/posts/publish)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as CreateCarouselRequest;
    console.log('Received carousel container creation request:', body);
    
    // Validate the request
    if (!body.containerIds || body.containerIds.length === 0) {
      console.log('Missing containerIds parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: containerIds' 
      }, { status: 400 });
    }
    
    // Validate Instagram's carousel limits (2-10 items)
    if (body.containerIds.length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Instagram requires at least 2 images for a carousel post' 
      }, { status: 400 });
    }
    
    if (body.containerIds.length > 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Instagram allows a maximum of 10 images in a carousel post' 
      }, { status: 400 });
    }
    
    try {
      console.log('Creating carousel container with IDs:', body.containerIds);
      
      // Step 2: Create carousel container with all container IDs
      const carouselContainerId = await createCarouselContainer(body.containerIds, body.caption);
      console.log('Successfully created carousel container with ID:', carouselContainerId);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          containerId: carouselContainerId
        }
      });
    } catch (error) {
      console.error('Error interacting with Instagram API:', error);
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create Instagram carousel container'
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