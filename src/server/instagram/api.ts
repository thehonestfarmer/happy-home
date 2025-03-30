/**
 * Instagram API client for managing Instagram posts
 * Based on Instagram Graph API v22.0
 */

// Access token and user ID from environment or config
const getAccessToken = () => process.env.INSTAGRAM_ACCESS_TOKEN;
const getBusinessAccountId = () => process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841470115210225';
const INSTAGRAM_API_VERSION = 'v22.0';
const INSTAGRAM_API_BASE_URL = 'https://graph.instagram.com';

export interface InstagramPostContainer {
  id: string;
  status_code: string;
}

export interface InstagramMediaPublishResponse {
  id: string;
  status: string;
}

export interface InstagramError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id: string;
}

/**
 * Error response from Instagram Graph API
 */
export interface InstagramErrorResponse {
  error: InstagramError;
}

/**
 * Result of a media container creation attempt
 */
export interface MediaContainerResult {
  success: boolean;
  containerId?: string;
  error?: string;
  imageUrl: string;
}

/**
 * Creates a media container for a photo to be posted to Instagram
 * @param imageUrl URL of the image to post
 * @param caption Optional caption for the post
 * @param isCarouselItem Whether this container is for a carousel (required for carousel items)
 * @returns Promise with creation ID
 */
export async function createMediaContainer(imageUrl: string, caption?: string, isCarouselItem = false): Promise<string> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Instagram access token is not configured');
  }

  const url = `${INSTAGRAM_API_BASE_URL}/${INSTAGRAM_API_VERSION}/${getBusinessAccountId()}/media`;
  
  // Use a plain object instead of FormData
  const requestBody: Record<string, string> = {
    access_token: accessToken,
    image_url: imageUrl,
  };
  
  // Add is_carousel_item=true when creating items for a carousel
  if (isCarouselItem) {
    requestBody.is_carousel_item = 'true';
  }
  
  if (caption) {
    requestBody.caption = caption;
  }

  try {
    console.log('Sending media container request...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json() as InstagramErrorResponse;
      console.error('Instagram API error response:', JSON.stringify(errorData, null, 2));
      throw new Error(`Instagram API error: ${errorData.error.message}`);
    }

    const data = await response.json() as { id: string; };
    return data.id;
  } catch (error) {
    console.error('Failed to create Instagram media container:', error);
    throw error;
  }
}

/**
 * Create a single media container with error handling
 * @param imageUrl URL of the image to post
 * @param isCarouselItem Whether this is for a carousel
 * @returns Promise with container result
 */
export async function createSingleMediaContainer(imageUrl: string, isCarouselItem = false): Promise<MediaContainerResult> {
  try {
    const containerId = await createMediaContainer(imageUrl, undefined, isCarouselItem);
    return {
      success: true,
      containerId,
      imageUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating media container',
      imageUrl
    };
  }
}

/**
 * Publishes a previously created media container to Instagram
 * @param creationId ID returned from createMediaContainer
 * @returns Promise with publish response
 */
export async function publishMedia(creationId: string): Promise<InstagramMediaPublishResponse> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Instagram access token is not configured');
  }

  const url = `${INSTAGRAM_API_BASE_URL}/${INSTAGRAM_API_VERSION}/${getBusinessAccountId()}/media_publish`;
  
  // Use a plain object instead of FormData
  const requestBody = {
    access_token: accessToken,
    creation_id: creationId
  };

  try {
    console.log('Sending media publish request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json() as InstagramErrorResponse;
      console.error('Instagram API error response:', JSON.stringify(errorData, null, 2));
      throw new Error(`Instagram API error: ${errorData.error.message}`);
    }

    return await response.json() as InstagramMediaPublishResponse;
  } catch (error) {
    console.error('Failed to publish Instagram media:', error);
    throw error;
  }
}

/**
 * Create multiple media containers in parallel
 * @param imageUrls Array of image URLs
 * @param forCarousel Whether these containers are for a carousel (enables carousel-specific settings)
 * @returns Promise with array of container results
 */
export async function createMediaContainers(imageUrls: string[], forCarousel = false): Promise<MediaContainerResult[]> {
  try {
    // Set isCarouselItem=true for all containers when creating for a carousel
    // This is required by Instagram for carousel media items
    const containerPromises = imageUrls.map(imageUrl => 
      createSingleMediaContainer(imageUrl, forCarousel)
    );
    
    // Wait for all promises to settle
    return await Promise.all(containerPromises);
  } catch (error) {
    console.error('Error creating media containers:', error);
    // Return failed results for all images in case of unexpected error
    return imageUrls.map(imageUrl => ({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create media container',
      imageUrl
    }));
  }
}

/**
 * Upload a carousel with the given container IDs
 * @param containerIds Array of container IDs
 * @param caption Caption for the post
 * @returns Promise with the carousel container ID
 */
export async function publishCarousel(containerIds: string[], caption: string): Promise<string> {
  if (containerIds.length === 0) {
    throw new Error('At least one container ID is required');
  }
  
  // Step 2: Create a carousel container with the individual media containers
  const carouselContainerId = await createCarouselContainer(containerIds, caption);
  
  return carouselContainerId;
}

/**
 * Creates a carousel of media and publishes it to Instagram
 * @param imageUrls Array of image URLs for the carousel
 * @param caption Caption for the post
 * @returns Promise with the published post ID
 */
export async function createAndPublishCarousel(imageUrls: string[], caption: string): Promise<string> {
  if (!imageUrls.length) {
    throw new Error('At least one image URL is required');
  }

  try {
    // Create containers for all images
    const containerResults = await createMediaContainers(imageUrls);
    
    // Check if all container creations were successful
    const failedContainers = containerResults.filter(result => !result.success);
    if (failedContainers.length > 0) {
      throw new Error(`Failed to create ${failedContainers.length} media containers`);
    }
    
    // Extract container IDs
    const containerIds = containerResults.map(result => result.containerId as string);
    
    // Publish the carousel
    return await publishCarousel(containerIds, caption);
  } catch (error) {
    console.error('Failed to create and publish Instagram carousel:', error);
    throw error;
  }
}

/**
 * Validates an image URL to ensure it's publicly accessible
 * @param url URL of the image to validate
 * @returns Object with validation result and any error message
 */
export async function validateImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if the URL is valid
    if (!url || !url.startsWith('http')) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Try to fetch the image to check if it's accessible
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD request for efficiency
      // Do not send cookies or credentials - mimics Instagram's behavior
      credentials: 'omit',
      cache: 'no-store'
    });

    if (!response.ok) {
      return { 
        valid: false, 
        error: `Image not accessible (${response.status}: ${response.statusText})` 
      };
    }

    // Check Content-Type to ensure it's an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return { 
        valid: false, 
        error: `URL does not point to an image (Content-Type: ${contentType || 'unknown'})` 
      };
    }

    // Check for supported formats (JPEG, PNG)
    const supportedFormats = ['image/jpeg', 'image/png'];
    if (!supportedFormats.some(format => contentType.includes(format))) {
      return { 
        valid: false, 
        error: `Instagram only supports JPG and PNG formats (detected: ${contentType})` 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating image URL:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error validating image URL' 
    };
  }
}

/**
 * Creates a carousel container with references to individual media containers
 * @param containerIds Array of container IDs to include in the carousel
 * @param caption Caption for the carousel post
 * @returns Promise with the carousel container ID
 */
export async function createCarouselContainer(containerIds: string[], caption: string): Promise<string> {
  if (containerIds.length < 2 || containerIds.length > 10) {
    throw new Error(`Carousel must contain between 2-10 items (received ${containerIds.length})`);
  }
  
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Instagram access token is not configured');
  }
  
  // Use a plain object instead of FormData
  const requestBody = {
    access_token: accessToken,
    media_type: 'CAROUSEL',
    caption: caption,
    children: containerIds
  };
  
  const carouselUrl = `${INSTAGRAM_API_BASE_URL}/${INSTAGRAM_API_VERSION}/${getBusinessAccountId()}/media`;
  
  try {
    console.log('Sending carousel container request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(carouselUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json() as InstagramErrorResponse;
      console.error('Instagram API error response:', JSON.stringify(errorData, null, 2));
      throw new Error(`Instagram API error: ${errorData.error.message}`);
    }
    
    const data = await response.json() as { id: string };
    return data.id;
  } catch (error) {
    console.error('Failed to create Instagram carousel container:', error);
    throw error;
  }
} 