"use client";
import { ListingsToolbar } from "./ListingsToolbar";
import { useAppContext } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";
import { ListingBox } from "./ListingBox";
import { convertCurrency, parseJapanesePrice } from "@/lib/listing-utils";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { LoadingListingCard } from "./LoadingListingCard";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import { Listing, parseLayout } from '@/lib/listing-utils';
import {
  AutoSizer as _AutoSizer,
  Grid as _Grid,
  AutoSizerProps,
  GridProps,
} from "react-virtualized";
import { CSSProperties, FC } from "react";

interface FilterState {
  showSold: boolean;
  priceRange: {
    min: number | null;
    max: number | null;
    currency: "JPY" | "USD" | "AUD" | "EUR";
  };
  layout: {
    minLDK: number | null;
  };
  listingType: "sold" | "for-sale" | null;
  size: {
    minBuildSize: number | null;
    maxBuildSize: number | null;
    minLandSize: number | null;
    maxLandSize: number | null;
  };
}

// Helper to check if filters are at default state
const isDefaultFilterState = (filterState: FilterState) => {
  return !filterState.showSold &&
    !filterState.priceRange.min &&
    !filterState.priceRange.max &&
    !filterState.layout.minLDK &&
    !filterState.listingType &&
    !filterState.size.minBuildSize &&
    !filterState.size.maxBuildSize &&
    !filterState.size.minLandSize &&
    !filterState.size.maxLandSize;
};

interface ListingsGridProps {
  listings: Listing[];
}

const Grid = _Grid as unknown as FC<GridProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

// Add the missing parsePriceJPY function
const parsePriceJPY = (price: string): number => {
  // return parseJapanesePrice(price);
  return 1000
};

export function ListingsGrid() {
  const { isLoading, error, listings } = useListings();
  const { filterState, setFilterState, displayState } = useAppContext();

  const filteredAndSortedListings = useMemo(() => {
    if (!listings) return [];
    
    const filteredListings = listings 
      .filter((listing) => !listing.isDuplicate)
      .filter((listing) => {
        if (filterState.priceRange.min || filterState.priceRange.max) {
          const priceJPY = parseJapanesePrice(listing.price);
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
      .filter((listing) => {
        if (filterState.layout.minLDK) {
          const layoutNumber = parseLayout(listing.layout);
          if (layoutNumber < filterState.layout.minLDK) {
            return false;
          }
        }
        return true;
      })
      .filter((listing) => {
        if (filterState.showSold) {
          return listing.isDetailSoldPresent;
        }
        return !listing.isDetailSoldPresent;
      });

    return filteredListings.sort((a, b) => {
      switch (displayState.sortBy) {
        case 'price-asc': {
          const priceA = parsePriceJPY(a.price);
          const priceB = parsePriceJPY(b.price);
          return priceA - priceB;
        }
        case 'price-desc': {
          const priceA = parsePriceJPY(a.price);
          const priceB = parsePriceJPY(b.price);
          return priceB - priceA;
        }
        default:
          return 0;
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
    setFilterState({
      showSold: false,
      priceRange: {
        min: null,
        max: null,
        currency: "USD"
      },
      layout: {
        minLDK: null,
      },
      listingType: "for-sale",
      size: {
        minBuildSize: null,
        maxBuildSize: null,
        minLandSize: null,
        maxLandSize: null
      }
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

  // Adjusted row height to reduce whitespace
  const ROW_HEIGHT = 450; // Reduced from 520

  // Calculate column count based on viewport width
  const getColumnCount = (width: number) => {
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    return 3; // Desktop
  };

  function cellRenderer({ columnIndex, key, rowIndex, style, width }: {
    columnIndex: number;
    key: string;
    rowIndex: number;
    style: CSSProperties;
    width: number;
  }) {
    const columnCount = getColumnCount(width);
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredAndSortedListings.length) return null;

    const listing = filteredAndSortedListings[index];
    
    return (
      <div 
        style={{
          ...style,
          padding: '12px',  // Increased padding from 8px to 12px
          boxSizing: 'border-box',
        }} 
        key={key}
      >
        <ListingBox
          property={listing}
          handleLightboxOpen={() => {}}
        />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load listings" message={error.message} />;
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
      <div className="flex-1">
        {filteredAndSortedListings.length > 0 ? (
          <div className="h-[calc(100vh-50px)]">
            <AutoSizer>
              {({ width, height }) => {
                const columnCount = getColumnCount(width);
                
                
                return (
                  <Grid
                    cellRenderer={({ columnIndex, key, rowIndex, style }) => 
                      cellRenderer({ columnIndex, key, rowIndex, style, width })
                    }
                    columnCount={columnCount}
                    columnWidth={width / columnCount}
                    height={height}
                    rowCount={Math.ceil(filteredAndSortedListings.length / columnCount)}
                    rowHeight={ROW_HEIGHT}
                    width={width}
                    noContentRenderer={() => <NoResults />}
                  />
                );
              }}
            </AutoSizer>
          </div>
        ) : (
          <NoResults />
        )}
      </div>
    </>
  );
} 