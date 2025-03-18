"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Home, Map, LayoutGrid } from 'lucide-react';
import { useListings } from '@/contexts/ListingsContext';
import { useMemo, useState } from 'react';
import { 
  Listing, 
  parseJapanesePrice, 
  formatPrice, 
  convertCurrency,
  EXCHANGE_RATES,
  Currency,
  CURRENCY_SYMBOLS
} from '@/lib/listing-utils';

// Helper to extract only the city from a full address
const extractCity = (address: string): string => {
  if (!address) return '';
  
  // Look for common city patterns in Japanese addresses
  const cityPattern = /(Niigata City|Tsubame City|[A-Za-z]+ City)/i;
  const match = address.match(cityPattern);
  
  if (match && match[0]) {
    return match[0];
  }
  
  // Fallback: return the last part of the address
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
};

// Extract only the city/district from an address (no prefecture)
const extractFormattedLocation = (address: string): string => {
  if (!address) {
    return '';
  }
  
  // First check for common patterns in English addresses
  
  // Try looking for "in [Location]" pattern, common in our data
  const inLocationMatch = address.match(/in\s+([^,]+)(?:,\s*([^,]+))?/i);
  if (inLocationMatch) {
    // Only use the first part (city) and ignore the region/prefecture
    const location = inLocationMatch[1];
    return location;
  }
  
  // Look for common city names
  const cityNames = [
    'Niigata', 'Tsubame', 'Kashiwazaki', 'Nagaoka', 'Shibata', 
    'Joetsu', 'Sanjo', 'Murakami', 'Tokamachi', 'Myoko', 'Ojiya'
  ];
  
  for (const city of cityNames) {
    if (address.includes(city)) {
      return city;
    }
  }
  
  // Split address by commas
  const parts = address.split(',').map(part => part.trim());
  
  // If we have multiple parts, just use the city/ward part (second last)
  if (parts.length >= 2) {
    const cityOrWard = parts[parts.length - 2]; // Second last part is usually city or ward
    return cityOrWard;
  }
  
  // If we don't have commas, try to find City/Ward pattern
  const cityMatch = address.match(/((?:City|Ward|Village|Town))/i);
  if (cityMatch && cityMatch.index) {
    // Try to extract a meaningful city name, looking back up to 20 chars before "City"
    const startPos = Math.max(0, cityMatch.index - 20);
    const endPos = cityMatch.index + cityMatch[0].length;
    const cityPart = address.substring(startPos, endPos).trim();
    return cityPart;
  }
  
  // If all else fails, just return a smaller portion of the address
  if (address.length > 20) {
    return address.substring(0, 20) + '...';
  }
  
  return address;
};

// Format price based on selected currency
const formatPriceWithCurrency = (priceStr: string | number, currency: Currency): string => {
  // Handle number or string price input
  const priceJPY = typeof priceStr === 'number' 
    ? priceStr 
    : parseJapanesePrice(priceStr);
    
  if (currency === 'JPY') {
    const millions = priceJPY / 1_000_000;
    return `¥${millions.toFixed(2)}M`;
  }
  const convertedPrice = convertCurrency(priceJPY, 'JPY', currency);
  return formatPrice(convertedPrice, currency);
};

// Helper to generate a meaningful title based on property characteristics
const generatePropertyTitle = (listing: Listing): string => {
  // If the property has a propertyTitle field, use it
  if (listing.propertyTitle) {
    return listing.propertyTitle;
  }
  
  // Use only address data, never use ID as address fallback
  const locationText = extractFormattedLocation(listing.address || 'Japan');
  
  // Check if layout is undefined or null, and use floorPlan as backup
  const layoutText = listing.layout || listing.floorPlan || 'Property';
  
  const title = `${layoutText} in ${locationText}`;
  
  return title;
};

// Format a simple date string for display - removing Japanese characters and standardizing format
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  
  // Remove Japanese characters and clean up
  const cleanedDate = dateStr
    .replace(/[年月日]/g, '-') // Replace Japanese year/month/day markers with dashes
    .replace(/[^\w\s\-\/\.]/g, '') // Remove other non-alphanumeric characters except for date separators
    .replace(/掲載$/, '') // Remove 掲載 (posted) at the end
    .replace(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/, '$1-$2-$3') // Standardize date format to YYYY-MM-DD
    .trim();
  
  // Try to parse as a date and format it
  try {
    const date = new Date(cleanedDate);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  } catch (e) {
    // Fall back to cleaned string if parsing fails
  }
  
  return cleanedDate || 'N/A';
};

// Find the most relevant features to highlight
const getPropertyHighlights = (listing: Listing): string[] => {
  const highlights: string[] = [];
  
  // Check for renovation date
  if (listing.dates?.dateRenovated) {
    highlights.push(`Renovated: ${listing.dates.dateRenovated}`);
  }
  
  if (listing.buildDate) {
    highlights.push(`Built: ${listing.buildDate}`);
  }
  
  // Add land size if available
  if (listing.landSqMeters || listing.landArea) {
    const landSize = listing.landSqMeters || listing.landArea;
    highlights.push(`Land: ${landSize}`);
  }
  
  // Add posting date if available
  if (listing.dates?.datePosted) {
    highlights.push(`Listed: ${listing.dates.datePosted}`);
  }
  
  // Add address snippet if no other highlights
  if (highlights.length === 0 && listing.originalAddress) {
    highlights.push(`Location: ${listing.originalAddress}`);
  }
  
  // If we still have no highlights, use listing details as fallback
  if (highlights.length === 0 && listing.details && listing.details.length > 0) {
    // Pick the first 2-3 meaningful details
    const meaningfulDetails = listing.details
      .filter(detail => detail.length > 5 && !detail.includes('N/A') && !detail.includes('undefined'))
      .slice(0, 3);
    
    highlights.push(...meaningfulDetails);
  }
  
  // Limit to max 4 highlights
  return highlights.slice(0, 4);
};

// Skeleton loader component for FeaturedListings
const FeaturedListingsSkeleton = () => {
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="h-8 bg-muted animate-pulse rounded w-64 mx-auto mb-4"></div>
        <div className="h-4 bg-muted animate-pulse rounded w-full max-w-2xl mx-auto mb-6"></div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-12 h-8 bg-muted animate-pulse rounded-full"></div>
            ))}
          </div>
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-1"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md h-[460px] flex flex-col">
            <div className="relative h-[220px] flex-shrink-0 bg-muted animate-pulse"></div>
            <div className="p-4 flex flex-col flex-grow space-y-4">
              <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
              <div className="h-8 bg-muted animate-pulse rounded w-1/2"></div>
              <div className="space-y-2 mt-auto">
                <div className="h-4 bg-muted animate-pulse rounded w-4/5"></div>
              </div>
              <div className="h-10 bg-muted animate-pulse rounded mt-auto"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <div className="h-12 bg-muted animate-pulse rounded w-48 mx-auto"></div>
      </div>
    </section>
  );
};

export const FeaturedListings = () => {
  const { listings, isLoading } = useListings();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  
  // Format exchange rate display
  const getExchangeRateText = (currency: Currency): string => {
    if (currency === 'JPY') {
      return 'Showing prices in native currency (JPY)';
    }
    const rate = EXCHANGE_RATES[currency];
    return `Exchange Rate: ¥${rate.toLocaleString()} = ${CURRENCY_SYMBOLS[currency]}1`;
  };

  const featuredListings = useMemo(() => {
    if (!listings || listings.length === 0) return [];
    
    // Take the first three non-duplicate, non-sold listings
    return listings
      .filter((listing: Listing) => !listing.isDuplicate && !listing.isDetailSoldPresent && !listing.isSold)
      .slice(0, 3)
      .map((listing: Listing) => {
        // Normalize address data for consistency
        const normalizedListing = {
          ...listing,
          // Ensure we have some form of address data, but never use ID as address
          englishAddress: listing.englishAddress || listing.address || listing.originalAddress || 'Location in Japan',
        };
        
        // Generate title using the normalized listing
        const title = generatePropertyTitle(normalizedListing);
        
        return {
          id: listing.id,
          title,
          price: listing.price,
          layout: listing.layout || listing.floorPlan || 'N/A',
          buildArea: listing.buildSqMeters || listing.buildArea || 'N/A',
          landArea: listing.landSqMeters || listing.landArea || 'N/A',
          imageUrl: listing.listingImages?.[0] || '/images/property-placeholder.jpg',
        };
      });
  }, [listings]);

  // Show skeleton loader while loading or if no listings are available yet
  if (isLoading) {
    return <FeaturedListingsSkeleton />;
  }

  if (featuredListings.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Featured Properties</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Discover our handpicked selection of distinctive Japanese properties, from traditional homes to modern living spaces.
        </p>
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center gap-2">
            {(Object.keys(EXCHANGE_RATES) as Currency[]).map((currency) => (
              <button
                key={currency}
                onClick={() => setSelectedCurrency(currency)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCurrency === currency
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {currency}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1 h-4">
            {getExchangeRateText(selectedCurrency)}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredListings.map((property) => (
          <div key={property.id} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-[460px] flex flex-col">
            <div className="relative h-[220px] flex-shrink-0">
              <Image
                src={property.imageUrl}
                alt={property.title || "Property image"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex-grow space-y-4">
                <h3 className="text-xl font-semibold line-clamp-2">
                  {property.title || `Property in Japan`}
                </h3>
                <p className="text-2xl font-bold">
                  {formatPriceWithCurrency(property.price, selectedCurrency)}
                </p>
                
                {/* Property details with icons */}
                <div className="space-y-2 mt-auto">
                  <div className="grid grid-cols-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="truncate">{property.layout}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <Home className="h-4 w-4" />
                      <span className="truncate">{property.buildArea}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Map className="h-4 w-4" />
                      <span className="truncate">{property.landArea}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Link 
                href={`/listings/view/${property.id}`}
                className="block w-full text-center py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors mt-4"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <Link 
          href="/listings"
          className="inline-flex items-center px-6 py-3 border border-primary text-primary hover:bg-muted rounded-md font-medium transition-colors"
        >
          View All Properties
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </section>
  );
}; 