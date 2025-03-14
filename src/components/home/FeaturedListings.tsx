"use client";
import Link from 'next/link';
import Image from 'next/image';
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
  console.log(address, ">>>>")
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

// Format price based on selected currency
const formatPriceWithCurrency = (priceStr: string, currency: Currency): string => {
  const priceJPY = parseJapanesePrice(priceStr);
  if (currency === 'JPY') {
    const millions = priceJPY / 1_000_000;
    return `¥${millions.toFixed(2)}M`;
  }
  const convertedPrice = convertCurrency(priceJPY, 'JPY', currency);
  return formatPrice(convertedPrice, currency);
};

// Helper to generate a meaningful title based on property characteristics
const generatePropertyTitle = (listing: Listing): string => {
  const city = extractCity(listing.englishAddress || listing.address);
  
  // Check for special features in recommendedText
  if ('recommendedText' in listing && Array.isArray(listing.recommendedText) && listing.recommendedText.length > 0) {
    // Check for historic/brewery mentions
    if (listing.recommendedText.some((text: string) => 
      text.toLowerCase().includes('brewery') || 
      text.toLowerCase().includes('meiji') ||
      text.toLowerCase().includes('historic'))) {
      return `Historic ${listing.layout} Brewery House`;
    }
    
    // Check for large parking
    if (listing.recommendedText.some((text: string) => 
      text.toLowerCase().includes('parking') && 
      text.toLowerCase().includes('car'))) {
      return `${listing.layout} Property with Large Parking`;
    }
    
    // Check for garden
    if (listing.recommendedText.some((text: string) => 
      text.toLowerCase().includes('garden') || 
      text.toLowerCase().includes('spacious'))) {
      return `Spacious ${listing.layout} with Garden`;
    }
  }
  
  // Check tags for features
  if ('tags' in listing && typeof listing.tags === 'string') {
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
      .filter((listing: Listing) => !listing.isDuplicate && !listing.isDetailSoldPresent)
      .slice(0, 3)
      .map((listing: Listing) => {
        // Generate title and get city
        const title = generatePropertyTitle(listing);
        const city = extractCity(listing.englishAddress || listing.address);
        
        return {
          id: listing.id,
          title,
          price: listing.price,
          location: city,
          layout: listing.layout || 'N/A',
          buildSqMeters: listing.buildArea || 'N/A',
          imageUrl: listing.listingImages?.[0] || '/images/property-placeholder.jpg'
        };
      });
  }, [listings]);

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
          <div key={property.id} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-[450px] flex flex-col">
            <div className="relative h-[220px] flex-shrink-0">
              <Image
                src={property.imageUrl}
                alt={property.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex-grow space-y-2 min-h-0">
                <h3 className="text-xl font-semibold truncate">{property.title}</h3>
                <div className="space-y-0.5">
                  <p className="text-2xl font-bold truncate">
                    {formatPriceWithCurrency(property.price, selectedCurrency)}
                  </p>
                </div>
                <p className="text-muted-foreground truncate">{property.location}</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{property.layout}</span>
                  <span>{`${property.buildSqMeters}`}{property.buildSqMeters !== 'N/A' ? ' m²' : ''}</span>
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