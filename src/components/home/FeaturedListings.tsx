"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useListings } from '@/contexts/ListingsContext';
import { useMemo } from 'react';
import { parseJapanesePrice } from '@/lib/listing-utils';

// Define the Listing type interface to align with what useListings provides
interface Listing {
  id: string;
  addresses: string;
  prices: string;
  listingImages: string[];
  layout?: string;
  buildSqMeters?: string;
  tags?: string;
  recommendedText?: string[];
  isDuplicate?: boolean;
  isDetailSoldPresent?: boolean;
}

// Helper to extract only the city from a full address
const extractCity = (address: string): string => {
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

// Helper to generate a meaningful title based on property characteristics
const generatePropertyTitle = (listing: Listing): string => {
  const city = extractCity(listing.addresses);
  
  // Check for special features in recommendedText
  if (listing.recommendedText && listing.recommendedText.length > 0) {
    // Check for historic/brewery mentions
    if (listing.recommendedText.some(text => 
      text.toLowerCase().includes('brewery') || 
      text.toLowerCase().includes('meiji') ||
      text.toLowerCase().includes('historic'))) {
      return `Historic ${listing.layout} Brewery House`;
    }
    
    // Check for large parking
    if (listing.recommendedText.some(text => 
      text.toLowerCase().includes('parking') && 
      text.toLowerCase().includes('car'))) {
      return `${listing.layout} Property with Large Parking`;
    }
    
    // Check for garden
    if (listing.recommendedText.some(text => 
      text.toLowerCase().includes('garden') || 
      text.toLowerCase().includes('spacious'))) {
      return `Spacious ${listing.layout} with Garden`;
    }
  }
  
  // Check tags for features
  if (listing.tags) {
    if (listing.tags.toLowerCase().includes('renovation')) {
      return `Renovated ${listing.layout} Home`;
    }
    
    if (listing.tags.toLowerCase().includes('balcony')) {
      return `${listing.layout} with Balcony`;
    }
  }
  
  // Default title based on layout
  return `${listing.layout || ''} Property in ${city}`;
};

export const FeaturedListings = () => {
  const { listings } = useListings();
  
  const featuredListings = useMemo(() => {
    if (!listings || listings.length === 0) return [];
    
    // Take the first three non-duplicate, non-sold listings
    return listings
      .filter((listing: Listing) => !listing.isDuplicate && !listing.isDetailSoldPresent)
      .slice(0, 3)
      .map((listing: Listing) => {
        // Generate title and get city
        const title = generatePropertyTitle(listing);
        const city = extractCity(listing.addresses);
        
        // Format the price safely
        let formattedPrice = '';
        try {
          // Try to parse the price if it's in Japanese format
          const priceValue = parseJapanesePrice(listing.prices);
          formattedPrice = `¥${priceValue.toLocaleString()}`;
        } catch (e) {
          // Fallback to displaying the price as-is
          formattedPrice = listing.prices;
        }
        
        return {
          id: listing.id,
          title,
          price: formattedPrice,
          location: city,
          layout: listing.layout || 'N/A',
          buildSqMeters: listing.buildSqMeters || 'N/A',
          imageUrl: listing.listingImages?.[0] || '/images/property-placeholder.jpg'
        };
      });
  }, [listings]);

  if (featuredListings.length === 0) {
    return null; // Don't render the section if no featured listings
  }

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Featured Properties</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover our handpicked selection of distinctive Japanese properties, from traditional homes to modern living spaces.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredListings.map((property) => (
          <div key={property.id} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <div className="relative h-60">
              <Image
                src={property.imageUrl}
                alt={property.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
              <p className="text-primary text-lg font-medium mb-2">{property.price}</p>
              <p className="text-muted-foreground mb-4">{property.location}</p>
              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span>{property.layout}</span>
                <span>{`${property.buildSqMeters}`}{property.buildSqMeters !== 'N/A' ? ' m²' : ''}</span>
              </div>
              <Link 
                href={`/listings/view/${property.id}`}
                className="block w-full text-center py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
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