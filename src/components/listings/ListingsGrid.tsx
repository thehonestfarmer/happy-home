"use client";
import { useLoadListings } from "@/hooks";
import { ListingsToolbar } from "./ListingsToolbar";
import { useAppContext } from "@/AppContext";
import { ListingBox } from "@/app/FilteredListingsBox";
import { convertCurrency } from "@/lib/listing-utils";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
  const listings = useLoadListings();
  const { filterState, setFilterState, displayState } = useAppContext();

  const filteredAndSortedListings = useMemo(() => {
    let result = listings.filter((property) => {
      // Handle price filter first
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

      // Handle layout filter
      if (filterState.layout.minLDK) {
        const layoutNumber = parseLayout(property.layout);
        if (layoutNumber < filterState.layout.minLDK) {
          return false;
        }
      }

      // Handle sold filter last
      if (filterState.showSold) {
        return property.isDetailSoldPresent;
      } else {
        return !property.isDetailSoldPresent;
      }
    });

    // Sort the filtered results
    return result.sort((a, b) => {
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
    displayState.sortBy
  ]);

  const handleResetFilters = () => {
    setFilterState((draft) => {
      draft.showSold = false;
      draft.priceRange.min = null;
      draft.priceRange.max = null;
      draft.layout.minLDK = null;
    });
  };

  const NoResults = () => {
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

  return (
    <>
      <ListingsToolbar />
      <div className="p-4">
        {filteredAndSortedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedListings.map((property) => (
              <ListingBox 
                key={property.id} 
                property={property}
                handleLightboxOpen={() => {}} 
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