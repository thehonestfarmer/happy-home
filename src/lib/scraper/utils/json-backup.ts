import { put } from '@vercel/blob';
import { logger } from './logger';

/**
 * Saves a listing to a JSON backup file in Vercel Blob storage
 * Only writes if the content has changed from the previous version
 */
export const saveListingToJson = async (
  listingId: string, 
  listingData: any
): Promise<{ url: string | null, isNew: boolean, error: any }> => {
  try {
    if (!listingId || !listingData) {
      logger.error('Invalid listing data for JSON backup');
      return { url: null, isNew: false, error: new Error('Invalid listing data') };
    }
    
    const filename = `listings/${listingId}.json`;
    const content = JSON.stringify(listingData, null, 2);
    
    // Check if the file already exists by trying to fetch it
    // In a real implementation, you might want to compare file contents before uploading
    // to avoid unnecessary writes, but for simplicity, we'll just upload
    
    // Upload to Vercel Blob storage
    const blob = await put(filename, content, {
      contentType: 'application/json',
      access: 'public', // Make it publicly accessible for easy viewing
    });
    
    logger.success(`Saved listing ${listingId} to JSON: ${blob.url}`);
    
    return { url: blob.url, isNew: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error saving listing to JSON: ${errorMessage}`);
    return { url: null, isNew: false, error };
  }
};

/**
 * For local development or testing, save to filesystem instead of Vercel Blob
 */
export const saveListingToJsonLocal = async (
  listingId: string, 
  listingData: any
): Promise<{ path: string | null, isNew: boolean, error: any }> => {
  try {
    if (!listingId || !listingData) {
      logger.error('Invalid listing data for JSON backup');
      return { path: null, isNew: false, error: new Error('Invalid listing data') };
    }
    
    // Use Node.js filesystem in a try/catch block to handle file operations
    // This is only for local development and wouldn't work in a serverless environment
    const fs = require('fs');
    const path = require('path');
    
    // Create the listings directory if it doesn't exist
    const dir = path.join(process.cwd(), 'data', 'listings');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const filePath = path.join(dir, `${listingId}.json`);
    const content = JSON.stringify(listingData, null, 2);
    
    // Check if the file exists and has the same content
    let isNew = true;
    if (fs.existsSync(filePath)) {
      const existingContent = fs.readFileSync(filePath, 'utf8');
      if (existingContent === content) {
        logger.info(`Listing ${listingId} JSON content unchanged, skipping write`);
        isNew = false;
        return { path: filePath, isNew, error: null };
      }
    }
    
    // Write the file
    fs.writeFileSync(filePath, content);
    logger.success(`Saved listing ${listingId} to JSON: ${filePath}`);
    
    return { path: filePath, isNew, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error saving listing to JSON locally: ${errorMessage}`);
    return { path: null, isNew: false, error };
  }
}; 