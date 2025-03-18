import * as path from 'path';
import * as fs from 'fs';

/**
 * Merges property titles from property-titles.json into batch_test_results.json
 */
async function mergeTitles() {
  try {
    // Define file paths
    const titlesPath = path.resolve(process.cwd(), 'property-titles.json');
    const dataPath = path.resolve(process.cwd(), 'public/batch_test_results.json');
    const outputPath = path.resolve(process.cwd(), 'public/batch_test_results.json');
    
    console.log('Starting merge operation...');
    console.log(`Reading titles from: ${titlesPath}`);
    console.log(`Reading property data from: ${dataPath}`);
    
    // Check if files exist
    if (!fs.existsSync(titlesPath)) {
      throw new Error(`Titles file not found at: ${titlesPath}`);
    }
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Property data file not found at: ${dataPath}`);
    }
    
    // Read files
    const titlesRaw = fs.readFileSync(titlesPath, 'utf8');
    const dataRaw = fs.readFileSync(dataPath, 'utf8');
    
    // Parse JSON
    const titles = JSON.parse(titlesRaw) as Record<string, { propertyTitle: string }>;
    const propertyData = JSON.parse(dataRaw) as Record<string, any>;
    
    console.log(`Loaded ${Object.keys(titles).length} titles`);
    console.log(`Loaded ${Object.keys(propertyData).length} properties`);
    
    // Merge titles into property data
    let mergeCount = 0;
    let missingCount = 0;
    
    for (const [address, titleData] of Object.entries(titles)) {
      if (propertyData[address]) {
        propertyData[address].propertyTitle = titleData.propertyTitle;
        mergeCount++;
      } else {
        console.warn(`Property not found for address: ${address}`);
        missingCount++;
      }
    }
    
    console.log(`Successfully merged ${mergeCount} titles into property data`);
    if (missingCount > 0) {
      console.warn(`Could not find matching properties for ${missingCount} titles`);
    }
    
    // Write merged data back to file
    fs.writeFileSync(outputPath, JSON.stringify(propertyData, null, 2));
    console.log(`Merged data written to: ${outputPath}`);
    
    console.log('Merge operation completed successfully');
  } catch (error) {
    console.error('Error merging titles:', error);
  }
}

// Run the merge operation
mergeTitles(); 