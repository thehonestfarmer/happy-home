import { Listing } from "./listing-utils";

/**
 * Returns the count of favorites that have valid coordinates and are not removed
 * @param favorites Array of favorite listing IDs
 * @param listings Array of all listings
 * @returns Number of valid favorites
 */
export const getValidFavoritesCount = (
  favorites: string[],
  listings: Listing[]
): number => {
  if (!listings?.length || !favorites?.length) return 0;
  
  // Count only favorites that:
  // 1. Exist in the listings array
  // 2. Have coordinates (lat and long)
  // 3. Are not removed
  // 4. Are not duplicates
  return listings.filter(listing => 
    listing.id && 
    favorites.includes(listing.id) && 
    listing.coordinates?.lat && 
    listing.coordinates?.long && 
    !listing.removed &&
    !listing.isDuplicate
  ).length;
}; 