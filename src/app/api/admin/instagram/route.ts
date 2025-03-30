import { NextRequest, NextResponse } from 'next/server';
import { createAndPublishCarousel, createMediaContainer } from '@/server/instagram/api';
import { readListings } from '../../cron/update-listings/listings-manager';

interface PostRequest {
  listingId: string;
  selectedImages: string[];
  caption: string;
  tags: string[];
}

interface CreateMediaContainersRequest {
  imageUrls: string[];
  forCarousel?: boolean;
}

/**
 * Posts selected images from a listing to Instagram or creates media containers
 */
export async function POST(request: NextRequest) {
  try {
    // Verify required env variables
    if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
      return NextResponse.json({ 
        success: false, 
        error: 'Instagram API credentials not configured' 
      }, { status: 500 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const isContainers = searchParams.get('containers') === 'true';
    
    // Parse the request body
    const contentType = request.headers.get('content-type') || '';
    
    // Handle media containers creation
    if (contentType.includes('application/json') && isContainers) {
      const body = await request.json() as CreateMediaContainersRequest;
      console.log('Received container creation request:', body);
      
      // Validate the request
      if (!body.imageUrls || body.imageUrls.length === 0) {
        console.log('Missing imageUrls parameter');
        return NextResponse.json({ 
          success: false, 
          error: 'Missing required parameter: imageUrls' 
        }, { status: 400 });
      }
      
      // Check if these containers are for a carousel
      // Default to true if we have 2+ images or if explicitly specified
      const isForCarousel = body.forCarousel ?? (body.imageUrls.length >= 2);
      console.log(`Creating containers with isForCarousel=${isForCarousel}`);
      
      // Process image URLs in parallel but limited to chunks of 3 at a time to avoid rate limiting
      console.log(`Starting chunked processing of ${body.imageUrls.length} media containers`);
      
      // Helper function to process images in chunks to avoid rate limiting
      async function processInChunks(urls: string[], chunkSize: number = 3): Promise<any[]> {
        const results: any[] = [];
        
        // Process images in chunks
        for (let i = 0; i < urls.length; i += chunkSize) {
          const chunk = urls.slice(i, i + chunkSize);
          console.log(`Processing chunk ${i/chunkSize + 1} with ${chunk.length} images (${i+1}-${Math.min(i+chunkSize, urls.length)} of ${urls.length})`);
          
          // Process this chunk in parallel
          const chunkResults = await Promise.all(
            chunk.map(async (imageUrl) => {
              try {
                console.log(`Creating container for image URL: ${imageUrl}`);
                // Create media container, setting isCarouselItem appropriately
                const containerId = await createMediaContainer(imageUrl, undefined, isForCarousel);
                console.log(`Successfully created container: ${containerId} for image: ${imageUrl}`);
                return {
                  success: true,
                  containerId,
                  imageUrl
                };
              } catch (error) {
                console.error(`Failed to create container for image URL: ${imageUrl}`, error);
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error creating media container',
                  imageUrl
                };
              }
            })
          );
          
          // Add this chunk's results to the overall results
          results.push(...chunkResults);
          
          // Add a small delay between chunks to avoid rate limiting
          if (i + chunkSize < urls.length) {
            console.log(`Waiting 500ms before processing next chunk...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        return results;
      }
      
      // Process all images in chunks of 3
      const results = await processInChunks(body.imageUrls, 3);
      
      console.log('Final container creation results:', results);
      return NextResponse.json({ 
        success: true, 
        data: results
      });
    }
    
    // Handle legacy full post flow (for backward compatibility)
    const body = await request.json() as PostRequest;
    
    // Validate the request
    if (!body.listingId || !body.selectedImages || body.selectedImages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: listingId, selectedImages' 
      }, { status: 400 });
    }
    
    // Get the listing data to verify image URLs
    const listings = await readListings(true);
    const listing = listings.newListings[body.listingId];
    
    if (!listing) {
      return NextResponse.json({ 
        success: false, 
        error: `Listing with ID ${body.listingId} not found` 
      }, { status: 404 });
    }
    
    // Verify all selected images exist in the listing
    if (!listing.listingImages || listing.listingImages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No images found for this listing' 
      }, { status: 400 });
    }
    
    // Filter only valid selected images
    const validImageUrls = body.selectedImages.filter(url => 
      listing.listingImages!.includes(url)
    );
    
    if (validImageUrls.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'None of the selected images were found in the listing' 
      }, { status: 400 });
    }
    
    // Format the caption with tags
    const formattedTags = body.tags.map(tag => `#${tag.trim().replace(/\s+/g, '')}`).join(' ');
    const fullCaption = body.tags.length > 0 ? `${body.caption}\n\n${formattedTags}` : body.caption;
    
    // Post to Instagram
    const postId = await createAndPublishCarousel(validImageUrls, fullCaption);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        postId,
        imageCount: validImageUrls.length,
        caption: fullCaption
      }
    });
  } catch (error) {
    console.error('Error posting to Instagram:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to post to Instagram'
    }, { status: 500 });
  }
} 