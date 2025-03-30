import { NextResponse } from 'next/server';

/**
 * This API route serves as a proxy for images from external domains
 * that have CORS restrictions. It fetches the image on the server side
 * and returns it directly, bypassing browser CORS limitations.
 */
export async function GET(request: Request) {
  // Get the URL from the query parameter
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  // Validate the URL
  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  // Optional: For security, you may want to restrict which domains can be proxied
  // For example, only allow images from shiawasehome-reuse.com
  if (!imageUrl.includes('shiawasehome-reuse.com')) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { 
        status: response.status 
      });
    }

    // Get the image data and content type
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
} 