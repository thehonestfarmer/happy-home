import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for our data structures
interface OriginalData {
  address: string;
  tags: string;
  listingDetail: string;
  price: string;
  layout: string;
  buildDate: string;
  facilities?: {
    water: string | null;
    gas: string | null;
    sewage: string | null;
    greyWater: string | null;
  };
  schools?: {
    primary: string | null;
    juniorHigh: string | null;
  };
  dates?: {
    datePosted: string | null;
    dateRenovated: string | null;
  };
  aboutProperty?: string;
}

interface Listing {
  tags: string;
  listingDetail: string;
  price: number;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingDetailUrl: string;
  buildDate: string;
  isSold: boolean;
  original: OriginalData;
  address?: string;
  id?: string;
  coordinates?: {
    lat: number | null;
    long: number | null;
  };
  dates?: {
    datePosted: string | null;
    dateRenovated: string | null;
  };
  aboutProperty?: string | null;
  listingImages?: string[];
  facilities?: {
    water: string | null;
    gas: string | null;
    sewage: string | null;
    greyWater: string | null;
  };
  schools?: {
    primary: string | null;
    juniorHigh: string | null;
  };
  propertyCaption?: string;
  hashTags?: string;
  propertyTitle?: string;
  shortDescription?: string;
}

type ListingsData = Record<string, Listing>;

// Export the merge function so it can be imported directly
export async function mergeListings() {
  try {
    console.log('Starting to merge listings...');
    
    // Define file paths
    const batchResultsPath = path.join(process.cwd(), 'public', 'batch_test_results.json');
    const newOutputPath = path.join(process.cwd(), 'new_output.json');
    
    // Check if files exist
    if (!fs.existsSync(batchResultsPath)) {
      console.error(`File not found: ${batchResultsPath}`);
      return;
    }
    
    if (!fs.existsSync(newOutputPath)) {
      console.error(`File not found: ${newOutputPath}`);
      return;
    }
    
    // Read both files
    console.log('Reading existing batch test results...');
    const batchResultsData: ListingsData = JSON.parse(fs.readFileSync(batchResultsPath, 'utf8'));
    
    console.log('Reading new output data...');
    const newOutputData: ListingsData = JSON.parse(fs.readFileSync(newOutputPath, 'utf8'));
    
    // Count entries before merging
    const batchResultsCount = Object.keys(batchResultsData).length;
    const newOutputCount = Object.keys(newOutputData).length;
    
    console.log(`Batch results contains ${batchResultsCount} listings`);
    console.log(`New output contains ${newOutputCount} listings`);
    
    // Merge the data
    console.log('Merging data...');
    const mergedData: ListingsData = { ...batchResultsData };
    
    // Add or update entries from new_output.json
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const [key, value] of Object.entries(newOutputData)) {
      if (!mergedData[key]) {
        // This is a new entry
        mergedData[key] = value;
        addedCount++;
        
        // Generate a unique ID if it doesn't exist
        if (!mergedData[key].id) {
          mergedData[key].id = generateUniqueId();
        }
      } else {
        // This entry already exists, update it with any new fields
        mergedData[key] = {
          ...mergedData[key],
          ...value,
          // Preserve the original ID
          id: mergedData[key].id
        };
        
        // Also merge the original data
        if (value.original && mergedData[key].original) {
          mergedData[key].original = {
            ...mergedData[key].original,
            ...value.original
          };
        }
        
        updatedCount++;
      }
    }
    
    // Write the merged data back to batch_test_results.json
    console.log('Writing merged data back to batch_test_results.json...');
    fs.writeFileSync(batchResultsPath, JSON.stringify(mergedData, null, 2), 'utf8');
    
    console.log(`Merge complete!`);
    console.log(`Added ${addedCount} new listings`);
    console.log(`Updated ${updatedCount} existing listings`);
    console.log(`Total listings in merged file: ${Object.keys(mergedData).length}`);

    return {
      addedCount,
      updatedCount,
      totalCount: Object.keys(mergedData).length
    };
    
  } catch (error) {
    console.error('Error merging listings:', error);
    throw error;
  }
}

// Helper function to generate a unique ID
function generateUniqueId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export using CommonJS export style
module.exports = { mergeListings };

// Only execute when run directly
if (require.main === module) {
  mergeListings().catch(console.error);
} 