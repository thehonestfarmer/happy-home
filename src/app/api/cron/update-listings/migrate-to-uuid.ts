import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

interface Listing {
  id: string | number;
  addresses: string;
  tags: string;
  listingDetail: string;
  prices: string;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
}

interface ListingsData {
  newListings: {
    [key: string]: Listing;
  };
}

async function migrateToUuid() {
  try {
    // Read the current listings file
    const data = await fs.readFile('./public/listings.json', 'utf8');
    const listings: ListingsData = JSON.parse(data);
    
    // Create new object with UUID keys
    const newListings: ListingsData['newListings'] = {};
    
    // Iterate through existing listings
    Object.values(listings.newListings).forEach((listing) => {
      const uuid = uuidv4();
      
      // Create new listing with UUID as id
      newListings[uuid] = {
        ...listing,
        id: uuid // Replace numeric id with UUID
      };
    });
    
    // Create new data structure
    const migratedData: ListingsData = {
      newListings
    };
    
    // Write the transformed data back to file
    await fs.writeFile(
      './public/listings.json',
      JSON.stringify(migratedData, null, 2),
      'utf8'
    );
    
    console.log('Successfully migrated listings to UUID format');
  } catch (error) {
    console.error('Error migrating listings:', error);
  }
}

// Run the migration
migrateToUuid(); 