import fs from 'fs';

interface ListingData {
  addresses: string[];
  tags: string[][];
  listingDetail: string[];
  prices: string[];
  layout: string[];
  buildSqMeters: string[];
  landSqMeters: string[];
  ids: string[];
  [key: string]: any[]; // for flexibility with additional fields
}

interface Listing {
  id: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
  [key: string]: any;
}

interface ExistingListings {
  [key: string]: Listing;
}

interface TransformedData {
  newListings: {
    [key: string]: Listing;
  };
}

// Function to zip object values into an object keyed by their UUID
export function zipObjectValues(obj: ListingData): TransformedData {
  const keys = Object.keys(obj);
  const length = Math.max(...keys.map((key) => obj[key].length));

  // Read existing listings if available
  let existingListings: ExistingListings = {};
  try {
    existingListings = JSON.parse(fs.readFileSync('./listings.json', 'utf8')).newListings || {};
  } catch (err) {
    console.log("No existing listings found, creating new file");
  }

  const zipped: { [key: string]: Listing } = {};
  for (let i = 0; i < length; i++) {
    // Create new listing object
    const newListing = keys.reduce((acc, key) => {
      acc[key] = obj[key][i];
      return acc;
    }, {} as Listing);

    const uuid = obj.ids[i]; // Use the UUID from the ids array

    // Merge with existing listing if it exists, but prefer new values
    zipped[uuid] = {
      ...existingListings[uuid], // existing values go first
      ...newListing,          // new values override existing ones
      // Keep certain properties from existing listings if they exist
      listingImages: existingListings[uuid]?.listingImages || [],
      recommendedText: existingListings[uuid]?.recommendedText || [],
      isDetailSoldPresent: existingListings[uuid]?.isDetailSoldPresent ?? false,
      id: uuid // Ensure the UUID is included in the listing
    };
  }

  return { newListings: zipped };
}

export function writeZippedObjectsToListing(input: ListingData): void {
  // Call the function and log the result
  const result = zipObjectValues(input);

  // Convert the object to a JSON string
  const jsonString = JSON.stringify(result, null, 2);

  // Write the JSON string to a file
  fs.writeFile("./listings.json", jsonString, "utf8", (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("JSON file has been saved.");
    }
  });
}
