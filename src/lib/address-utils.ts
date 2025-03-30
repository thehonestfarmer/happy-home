/**
 * Utility functions for parsing Japanese addresses
 */

/**
 * Extracts city and prefecture from a Japanese address string
 * 
 * @param address The full address string
 * @returns Object containing extracted city and prefecture
 */
export function extractCityAndPrefecture(address: string): { city: string; prefecture: string } {
  if (!address) return { city: '', prefecture: '' };
  
  // Try to handle address in format "Shinkawacho, Higashi-ku, Niigata City, Niigata Prefecture"
  const parts = address.split(',').map(part => part.trim());
  
  // Default empty values
  let city = '';
  let prefecture = '';
  
  // Look for parts containing "City" or "Prefecture"
  for (const part of parts) {
    if (part.includes('City') && !city) {
      city = part;
    } else if (part.includes('Prefecture') && !prefecture) {
      prefecture = part;
    }
  }
  
  // If city wasn't found but we have enough parts, use the second-to-last part
  if (!city && parts.length >= 2) {
    // If we have "Niigata Prefecture" but no explicit city,
    // try to derive city from prefecture or use ward/district
    if (prefecture) {
      const prefNameOnly = prefecture.replace(' Prefecture', '');
      city = `${prefNameOnly} City`;
      
      // If we have a ward/district (ku), include that in the city
      const wardPart = parts.find(p => p.includes('-ku'));
      if (wardPart) {
        city = `${wardPart}, ${city}`;
      }
    } else {
      // No identifiable prefecture, use the part before the last one
      city = parts[parts.length - 2];
    }
  }
  
  // If prefecture wasn't found but we have enough parts, use the last part
  if (!prefecture && parts.length >= 1) {
    prefecture = parts[parts.length - 1];
    // If it doesn't say "Prefecture", add it
    if (!prefecture.includes('Prefecture')) {
      prefecture += prefecture ? ' Prefecture' : '';
    }
  }
  
  // For addresses in the original Japanese format (reversed order)
  // Example: "新潟県新潟市東区新川町" (Niigata Prefecture, Niigata City, Higashi-ku, Shinkawacho)
  if (!city && !prefecture && parts.length === 1) {
    const originalAddress = parts[0];
    
    if (originalAddress.includes('県')) {
      // Try to parse Japanese format
      const prefMatch = originalAddress.match(/(.+?県)/);
      const cityMatch = originalAddress.match(/(.+?県)(.+?市)/);
      
      prefecture = prefMatch ? prefMatch[1] : '';
      city = cityMatch ? cityMatch[2] : '';
    }
  }
  
  return { city, prefecture };
}

/**
 * Returns a formatted location string from city and prefecture
 * Handles cases where one or both values might be missing
 */
export function formatLocation(city: string, prefecture: string): string {
  const cityClean = city ? city.trim() : '';
  const prefClean = prefecture ? prefecture.trim() : '';
  
  if (cityClean && prefClean) {
    // Check if city already contains prefecture name to avoid redundancy
    if (cityClean.includes(prefClean.replace(' Prefecture', ''))) {
      return cityClean;
    }
    return `${cityClean}, ${prefClean}`;
  }
  
  return cityClean || prefClean;
}

/**
 * Parse the address from a listing object
 */
export function parseListingLocation(listing: any): { city: string; prefecture: string } {
  // If listing already has city and prefecture properties, use those
  if (listing.city && listing.prefecture) {
    return { city: listing.city, prefecture: listing.prefecture };
  }
  
  // Otherwise extract from address
  return extractCityAndPrefecture(listing.address || '');
} 