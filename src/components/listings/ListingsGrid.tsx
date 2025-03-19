"use client";
import { ListingsToolbar } from "./ListingsToolbar";
import { useAppContext, FilterState } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";
import { ListingBox } from "./ListingBox";
import { convertCurrency, parseJapanesePrice } from "@/lib/listing-utils";
import { useMemo, useRef, useEffect } from "react";
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
  GridCellProps,
  Grid as GridType
} from "react-virtualized";
import { CSSProperties, FC } from "react";

// Helper to check if filters are at default state
const isDefaultFilterState = (filterState: FilterState) => {
  return (filterState.showForSale && !filterState.showSold) &&
    !filterState.priceRange.min &&
    !filterState.priceRange.max &&
    !filterState.layout.minLDK &&
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
  // Create a ref for the Grid component
  const gridRef = useRef<GridType | null>(null);

  // Setup resize handler with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let prevWidth = window.innerWidth;
    let prevColumnCount = getColumnCount(prevWidth);
    
    const handleResize = () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set a new timeout - 150ms delay is a good balance between responsiveness and performance
      timeoutId = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const currentColumnCount = getColumnCount(currentWidth);
        
        // Recompute grid size when the resize is complete
        if (gridRef.current) {
          // Always recompute if column count changed (breakpoint crossed)
          if (currentColumnCount !== prevColumnCount) {
            console.log('Column count changed, recomputing grid size');
            gridRef.current.recomputeGridSize();
            triggerScrollUpdateAfterDelay();
          } 
          // If width changed significantly (by more than 5%), recompute
          else if (Math.abs(currentWidth - prevWidth) / prevWidth > 0.05) {
            console.log('Significant width change, recomputing grid size');
            gridRef.current.recomputeGridSize();
            triggerScrollUpdateAfterDelay();
          }
        }
        
        // Update previous values for next comparison
        prevWidth = currentWidth;
        prevColumnCount = currentColumnCount;
      }, 150);
    };
    
    // Helper function to trigger a small scroll to force react-virtualized to update
    const triggerScrollUpdateAfterDelay = () => {
      // Wait a small amount of time after recomputing before triggering scroll
      setTimeout(() => {
        if (gridRef.current) {
          // Get the current scroll position
          const scrollTop = gridRef.current.state?.scrollTop || 0;
          const scrollLeft = gridRef.current.state?.scrollLeft || 0;
          
          // Scroll down 1px and then immediately back to force update
          gridRef.current.scrollToPosition({ scrollLeft, scrollTop: scrollTop + 1 });
          
          // Wait a tiny moment before scrolling back to prevent flicker
          setTimeout(() => {
            if (gridRef.current) {
              gridRef.current.scrollToPosition({ scrollLeft, scrollTop });
            }
          }, 10);
        }
      }, 50);
    };
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Initial grid recomputation after mount
    if (gridRef.current) {
      setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.recomputeGridSize();
        }
      }, 100);
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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
        // Show both types when both filters are enabled
        const showForSale = filterState.showForSale !== false; // Default to true
        const showSold = filterState.showSold === true; // Default to false
        
        // Normalize the isSold property to handle different value types
        // If listing.isSold is undefined/null/false, consider it as "for sale"
        const isListingSold = listing.isSold === true || listing.isDetailSoldPresent === true;
        
        if (showForSale && showSold) {
          // Show all listings when both options are selected
          return true;
        } else if (showForSale) {
          // Only show for-sale listings
          return !listing.isSold;
        } else if (showSold) {
          // Only show sold listings
          return listing.isSold;
        } else {
          // If neither is selected (edge case), show nothing
          return false;
        }
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
      showForSale: true,
      showSold: false,
      priceRange: {
        min: null,
        max: null,
        currency: "USD"
      },
      layout: {
        minLDK: null,
      },
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
      if (filteredAndSortedListings.length === 0) {
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
  }, [filterState, handleResetFilters, filteredAndSortedListings]);

  // Dynamic row height calculation based on viewport width
  const getRowHeight = (width: number): number => {
    let baseHeight = 336;

    if (width > 1024) {
      baseHeight = 384;
    } else if (width < 640) {
      baseHeight = 364;
    }
    
    
    // Calculate column count - same logic as getColumnCount
    const columnCount = getColumnCount(width);
    
    // Get the column width 
    const columnWidth = width / columnCount;
    
    // Calculate dynamic height that scales with column width 
    // to maintain proportion between card width and height
    
    // Reduced scaling factor to decrease whitespace
    const scalingFactor = 0.2; // 20% of column width added to base height
    
    // Calculate additional height based on column width
    const additionalHeight = Math.floor(columnWidth * scalingFactor);
    
    // Apply minimum and maximum constraints
    const minHeight = baseHeight;
    const maxHeight = 550; // Reduced maximum height to avoid excess whitespace
    
    // Return the clamped height value
    return Math.min(maxHeight, Math.max(minHeight, baseHeight + additionalHeight));
  };

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
    
    // Calculate responsive padding based on viewport size
    const getPadding = () => {
      // Use consistent padding across all device sizes to maintain even spacing
      return 8; // Consistent padding for all screen sizes
    };
    
    return (
      <div 
        style={{
          ...style,
          padding: `${getPadding()}px`,
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
                    ref={gridRef}
                    cellRenderer={({ columnIndex, key, rowIndex, style }) => 
                      cellRenderer({ columnIndex, key, rowIndex, style, width })
                    }
                    columnCount={columnCount}
                    columnWidth={width / columnCount}
                    height={height}
                    rowCount={Math.ceil(filteredAndSortedListings.length / columnCount)}
                    rowHeight={getRowHeight(width)}
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