"use client";
import { useListings } from "@/contexts/ListingsContext";
import { ListingsToolbar } from "./ListingsToolbar";
import { useAppContext } from "@/AppContext";
import { ListingBox } from "@/app/FilteredListingsBox";
import { convertCurrency } from "@/lib/listing-utils";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { LoadingListingCard } from "./LoadingListingCard";
import { ErrorDisplay } from "../ui/ErrorDisplay";

interface FilterState {
  showSold: boolean;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  layout: {
    minLDK: number | null;
  };
}

interface ListingData {
  id: string;
  addresses: string;
  isDuplicate?: boolean;
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

const parsePriceJPY = (priceStr: string): number => {
  // Extract number from strings like "18.8 million yen"
  const match = priceStr.match(/(\d+\.?\d*)/);
  if (!match) return 0;
  const number = parseFloat(match[1]);
  return number * 1_000_000; // Convert to full yen amount
};

const parseLayout = (layout: string): number => {
  // Handle cases like "9DK", "2LDK", etc.
  const match = layout.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// Helper to check if filters are at default state
const isDefaultFilterState = (filterState: FilterState) => {
  return !filterState.showSold &&
    !filterState.priceRange.min &&
    !filterState.priceRange.max &&
    !filterState.layout.minLDK;
};

export function ListingsGrid() {
  const { listings, isLoading, error } = useListings();
  const { filterState, setFilterState, displayState } = useAppContext();

  console.log(listings);

  const filteredAndSortedListings = useMemo(() => {
    if (!listings) return [];
    
    // First filter
    const filteredListings = listings 
      // Filter out duplicates
      .filter((listing: ListingData) => !listing.isDuplicate)
      // Handle price filter first
      .filter((property: ListingData) => {
        if (filterState.priceRange.min || filterState.priceRange.max) {
          const priceJPY = parsePriceJPY(property.prices);
          const priceUSD = convertCurrency(priceJPY, "JPY", "USD");

          if (filterState.priceRange.min && priceUSD < filterState.priceRange.min) {
            return false;
          }
          if (filterState.priceRange.max && priceUSD > filterState.priceRange.max) {
            return false;
          }
        }
        return true;
      })
      // Handle layout filter
      .filter((property: ListingData) => {
        if (filterState.layout.minLDK) {
          const layoutNumber = parseLayout(property.layout);
          if (layoutNumber < filterState.layout.minLDK) {
            return false;
          }
        }
        return true;
      })
      // Handle sold filter last
      .filter((property: ListingData) => {
        if (filterState.showSold) {
          return property.isDetailSoldPresent;
        } else {
          return !property.isDetailSoldPresent;
        }
      });

    // Then sort
    return filteredListings.sort((a, b) => {
      switch (displayState.sortBy) {
        case 'price-asc': {
          const priceA = parsePriceJPY(a.prices);
          const priceB = parsePriceJPY(b.prices);
          return priceA - priceB;
        }
        case 'price-desc': {
          const priceA = parsePriceJPY(a.prices);
          const priceB = parsePriceJPY(b.prices);
          return priceB - priceA;
        }
        // Add other sort options as needed
        default:
          return 0; // Keep original order for 'recommended'
      }
    });
  }, [
    listings,
    filterState.showSold,
    filterState.priceRange.min,
    filterState.priceRange.max,
    filterState.layout.minLDK,
    displayState.sortBy // Add this back to dependencies
  ]);

  const handleResetFilters = () => {
    setFilterState((draft) => {
      draft.showSold = false;
      draft.priceRange.min = null;
      draft.priceRange.max = null;
      draft.layout.minLDK = null;
    });
  };

  // Extract NoResults into a memoized component outside of the render logic
  const NoResults = useMemo(() => {
    return () => {
      if (!isDefaultFilterState(filterState)) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <p className="text-lg font-medium">
              Hmm... We couldn't find any properties matching your criteria 🤔
            </p>
            <p className="text-muted-foreground">
              Try adjusting your filters - we're adding new properties regularly!
            </p>
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="mt-4"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All Filters
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-lg font-medium">
            No properties available at the moment
          </p>
          <p className="text-muted-foreground">
            Check back soon - we're adding new listings regularly!
          </p>
        </div>
      );
    };
  }, [filterState, handleResetFilters]);

  if (error) {
    return (
      <div className="grid place-items-center min-h-[50vh]">
        <ErrorDisplay
          title="Failed to load listings"
          message={error.message}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingListingCard key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="grid place-items-center min-h-[50vh]">
        <p className="text-muted-foreground">No listings found</p>
      </div>
    );
  }

  return (
    <>
      <ListingsToolbar />
      <div className="p-4">
        {filteredAndSortedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedListings.map((property) => (
              <ListingBox key={property.id} property={property}
                handleLightboxOpen={() => { }}
              />
            ))}
          </div>
        ) : (
          <NoResults />
        )}
      </div>
    </>
  );
} 