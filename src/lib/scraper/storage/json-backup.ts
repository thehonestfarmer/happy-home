/**
 * JSON Backup System
 * 
 * Functions for backing up scraped data to JSON files in Vercel Blob Storage.
 */

import { put, list, del } from '@vercel/blob';
import { createHash } from 'crypto';
import { createContextLogger } from '../utils/logger';

// Create a context-specific logger
const logger = createContextLogger('Storage:JSON');

// Constants
const BACKUP_PREFIX = 'real-estate-backup';
const MAX_BACKUPS_PER_LISTING = 5; // Keep no more than 5 historical backups per listing

/**
 * Generate a unique filename for a listing backup
 * 
 * @param listingId The unique ID of the listing
 * @param timestamp Optional timestamp to include in filename (defaults to current time)
 * @returns A unique filename for the backup
 */
const generateBackupFilename = (listingId: string, timestamp?: Date): string => {
  const ts = timestamp || new Date();
  const formattedDate = ts.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  return `${BACKUP_PREFIX}/${listingId}/${formattedDate}.json`;
};

/**
 * Calculate content hash for data comparison
 * 
 * @param data The data object to hash
 * @returns SHA-256 hash of the data
 */
const calculateContentHash = (data: Record<string, any>): string => {
  // Sort keys for consistent hash generation regardless of object property order
  const sortedJson = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(sortedJson).digest('hex');
};

/**
 * Save backup JSON to Vercel Blob Storage
 * 
 * @param listingId The unique ID of the listing
 * @param data The data to save
 * @returns URL of the saved file or null on failure
 */
export const saveBackupJson = async (
  listingId: string,
  data: Record<string, any>
): Promise<string | null> => {
  try {
    // Add metadata
    const backupData = {
      ...data,
      _meta: {
        backupTimestamp: new Date().toISOString(),
        listingId,
        hash: calculateContentHash(data),
      },
    };
    
    // Convert to JSON
    const jsonContent = JSON.stringify(backupData, null, 2);
    
    // Generate filename
    const filename = generateBackupFilename(listingId);
    
    // Upload to Vercel Blob
    const { url } = await put(filename, jsonContent, {
      contentType: 'application/json',
      access: 'public',
    });
    
    logger.success(`Saved backup JSON for listing ${listingId} to ${url}`);
    
    // Cleanup old backups to prevent excessive storage use
    await cleanupOldBackups(listingId);
    
    return url;
  } catch (error) {
    logger.error(`Failed to save backup JSON for listing ${listingId}`, error);
    return null;
  }
};

/**
 * Get the latest backup for a listing
 * 
 * @param listingId The unique ID of the listing
 * @returns The backup data or null if not found
 */
export const getLatestBackup = async (
  listingId: string
): Promise<Record<string, any> | null> => {
  try {
    // List backups for this listing
    const { blobs } = await list({
      prefix: `${BACKUP_PREFIX}/${listingId}/`,
    });
    
    if (blobs.length === 0) {
      logger.info(`No backup found for listing ${listingId}`);
      return null;
    }
    
    // Sort by creation date (newest first)
    const sortedBlobs = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    // Get the latest backup
    const latestBackup = sortedBlobs[0];
    
    // Fetch the content
    const response = await fetch(latestBackup.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch backup: ${response.statusText}`);
    }
    
    const backupData = await response.json();
    logger.success(`Retrieved latest backup for listing ${listingId}`);
    
    return backupData;
  } catch (error) {
    logger.error(`Failed to get latest backup for listing ${listingId}`, error);
    return null;
  }
};

/**
 * Save data only if it has changed from the latest backup
 * 
 * @param listingId The unique ID of the listing
 * @param data The data to save
 * @returns URL of the saved file or null if no changes detected or on failure
 */
export const saveIfChanged = async (
  listingId: string,
  data: Record<string, any>
): Promise<string | null> => {
  try {
    // Get latest backup to compare
    const latestBackup = await getLatestBackup(listingId);
    
    // If no previous backup exists, save immediately
    if (!latestBackup) {
      return await saveBackupJson(listingId, data);
    }
    
    // Compare content hashes
    const newHash = calculateContentHash(data);
    const oldHash = latestBackup._meta?.hash;
    
    // Only save if the content has changed
    if (newHash !== oldHash) {
      logger.info(`Changes detected for listing ${listingId}, saving new backup`);
      return await saveBackupJson(listingId, data);
    } else {
      logger.info(`No changes detected for listing ${listingId}, skipping backup`);
      return null;
    }
  } catch (error) {
    logger.error(`Error in saveIfChanged for listing ${listingId}`, error);
    // On error, save anyway to be safe
    return await saveBackupJson(listingId, data);
  }
};

/**
 * Clean up old backups, keeping only the most recent ones
 * 
 * @param listingId The unique ID of the listing
 * @returns Number of backups deleted
 */
const cleanupOldBackups = async (listingId: string): Promise<number> => {
  try {
    // List all backups for this listing
    const { blobs } = await list({
      prefix: `${BACKUP_PREFIX}/${listingId}/`,
    });
    
    // If we have fewer than the max, no cleanup needed
    if (blobs.length <= MAX_BACKUPS_PER_LISTING) {
      return 0;
    }
    
    // Sort by creation date (newest first)
    const sortedBlobs = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    // Get the backups to delete (keep the newest ones)
    const blobsToDelete = sortedBlobs.slice(MAX_BACKUPS_PER_LISTING);
    
    // Delete old backups
    for (const blob of blobsToDelete) {
      await del(blob.url);
      logger.info(`Deleted old backup: ${blob.url}`);
    }
    
    logger.success(`Cleaned up ${blobsToDelete.length} old backups for listing ${listingId}`);
    return blobsToDelete.length;
  } catch (error) {
    logger.error(`Failed to clean up old backups for listing ${listingId}`, error);
    return 0;
  }
}; 