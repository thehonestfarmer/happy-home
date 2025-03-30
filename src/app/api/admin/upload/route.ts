import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createMediaContainer } from '@/server/instagram/api';
import { nanoid } from 'nanoid';

/**
 * Uploads an image to Vercel Blob storage and/or creates an Instagram media container.
 * Supports both regular image URLs and data URLs (base64 encoded images).
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'Missing URL parameter'
      }, { status: 400 });
    }

    console.log('Processing upload request for:', url.substring(0, 100) + '...');

    // Check if this is a data URL
    const isDataUrl = url.startsWith('data:');
    let publicUrl = url;
    
    // If it's a data URL, we need to upload it to Blob storage first
    if (isDataUrl) {
      try {
        console.log('Detected data URL, uploading to Blob storage...');
        
        // Extract MIME type and base64 data
        const matches = url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid data URL format');
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        const fileExt = mimeType.split('/')[1] || 'jpg';
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate a unique filename with proper extension
        const filename = `overlay-${nanoid()}.${fileExt}`;
        
        // Upload to Vercel Blob storage
        const blob = await put(filename, buffer, {
          contentType: mimeType,
          access: 'public', // Make publicly accessible
        });
        
        console.log(`Successfully uploaded data URL to Blob storage: ${blob.url}`);
        publicUrl = blob.url;
      } catch (error) {
        console.error('Error uploading data URL to Blob storage:', error);
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload data URL'
        }, { status: 500 });
      }
    }
    
    // Now we have a public URL (either the original or newly created),
    // create an Instagram media container
    try {
      console.log('Creating Instagram media container with URL:', publicUrl);
      const containerId = await createMediaContainer(publicUrl);
      console.log('Successfully created media container with ID:', containerId);
      
      return NextResponse.json({
        success: true,
        url: publicUrl,
        containerId,
        isDataUrl
      });
    } catch (error) {
      console.error('Error creating Instagram media container:', error);
      
      // If we already uploaded to Blob storage, still return that URL even if Instagram fails
      if (isDataUrl) {
        return NextResponse.json({
          success: false,
          url: publicUrl,
          error: error instanceof Error ? error.message : 'Failed to create Instagram media container',
          isDataUrl
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Instagram media container'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error processing upload request:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing upload'
    }, { status: 500 });
  }
} 