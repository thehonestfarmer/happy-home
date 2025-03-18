import * as path from 'path';
import * as fs from 'fs';

/**
 * Merges property captions from property-captions.json directly into batch_test_results.json
 */
async function mergeCaptions() {
  try {
    // Define file paths
    const captionsPath = path.resolve(process.cwd(), 'property-captions.json');
    const dataPath = path.resolve(process.cwd(), 'public/batch_test_results.json');
    
    console.log('Starting merge operation...');
    console.log(`Reading captions from: ${captionsPath}`);
    console.log(`Reading property data from: ${dataPath}`);
    
    // Check if files exist
    if (!fs.existsSync(captionsPath)) {
      throw new Error(`Captions file not found at: ${captionsPath}`);
    }
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Property data file not found at: ${dataPath}`);
    }
    
    // Read files
    const captionsRaw = fs.readFileSync(captionsPath, 'utf8');
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    
    // Parse JSON
    const captions = JSON.parse(captionsRaw) as Record<string, { propertyCaption: string, hashTags: string }>;
    const propertyData = JSON.parse(dataRaw) as Record<string, any>;
    
    console.log(`Loaded ${Object.keys(captions).length} captions`);
    console.log(`Loaded ${Object.keys(propertyData).length} properties`);
    
    // Create a backup of the original file
    const backupPath = path.resolve(process.cwd(), 'public/batch_test_results.backup.json');
    fs.writeFileSync(backupPath, dataRaw);
    console.log(`Created backup of original data at: ${backupPath}`);
    
    // Merge captions into property data
    let mergeCount = 0;
    let missingCount = 0;
    
    for (const [address, captionData] of Object.entries(captions)) {
      if (propertyData[address]) {
        propertyData[address].propertyCaption = captionData.propertyCaption;
        propertyData[address].hashTags = captionData.hashTags;
        mergeCount++;
      } else {
        console.warn(`Property not found for address: ${address}`);
        missingCount++;
      }
    }
    
    console.log(`Successfully merged ${mergeCount} captions into property data`);
    if (missingCount > 0) {
      console.warn(`Could not find matching properties for ${missingCount} captions`);
    }
    
    // Write merged data back to the original file
    fs.writeFileSync(dataPath, JSON.stringify(propertyData, null, 2));
    console.log(`Merged data written back to original file: ${dataPath}`);
    
    console.log('Merge operation completed successfully');
  } catch (error) {
    console.error('Error merging captions:', error);
  }
}

// Run the merge operation
mergeCaptions(); 