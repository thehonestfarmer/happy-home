"use client";
import { ListingsToolbar } from "./ListingsToolbar";
import { useAppContext, FilterState, defaultFilterState } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";
import { ListingBox } from "./ListingBox";
import { convertCurrency, parseJapanesePrice } from "@/lib/listing-utils";
import { useMemo, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { LoadingListingCard } from "./LoadingListingCard";
import { ErrorDisplay } from "../ui/ErrorDisplay";
import { Listing, parseLayout } from '@/lib/listing-utils';
import { getValidFavoritesCount } from "@/lib/favorites-utils";
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
    !filterState.showOnlyFavorites &&
    !filterState.showOnlySeen &&
    !filterState.priceRange.min &&
    !filterState.priceRange.max &&
    !filterState.layout.minLDK &&
    !filterState.size.minBuildSize &&
    !filterState.size.maxBuildSize &&
    !filterState.size.minLandSize &&
    !filterState.size.maxLandSize;
};

interface ListingsGridProps {
  listings?: Listing[];
  onSelectProperty?: (id: string | null) => void;
}

const Grid = _Grid as unknown as FC<GridProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

// Add the missing parsePriceJPY function
const parsePriceJPY = (price: string): number => {
  // Don't return a constant value - actually parse the price
  return parseJapanesePrice(price);
};

// Calculate responsive padding based on viewport size
const getPadding = (width?: number) => {
  // Use consistent padding across all device sizes to maintain even spacing
  return 8; // Consistent padding for all screen sizes
};

// Function to get hidden listings from localStorage
const getHiddenListingsFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const hiddenListingsString = localStorage.getItem('hiddenListings');
    if (!hiddenListingsString) return [];
    
    const parsed = JSON.parse(hiddenListingsString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing hidden listings:', error);
    return [];
  }
};

export function ListingsGrid({ onSelectProperty }: ListingsGridProps) {
  const { isLoading, error, listings } = useListings();
  const { filterState, setFilterState, displayState, favorites, isReady } = useAppContext();
  // Create a ref for the Grid component
  const gridRef = useRef<GridType | null>(null);
  
  // Store the previously filtered listings to prevent flickering
  const [cachedListings, setCachedListings] = useState<Listing[]>([]);

  // Create a reference to track if we should update the cache
  const shouldUpdateCacheRef = useRef(false);

  // Load hidden listings once on component mount
  const [hiddenListings, setHiddenListings] = useState<string[]>([]);
  
  useEffect(() => {
    setHiddenListings(getHiddenListingsFromStorage());
  }, []);

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

  // First run - on data prerequisites change, compute filtered listings but don't update state yet
  const computedListings = useMemo(() => {
    // Skip computation if we don't have the necessary data
    if (!isReady || !listings || listings.length === 0) {
      return null; // Return null to indicate we need to use cached results
    }
    
    // Get viewed listings from localStorage if needed
    let viewedListings: string[] = [];
    if (filterState.showOnlySeen && typeof window !== 'undefined') {
      try {
        const viewedListingsString = localStorage.getItem('viewedListings');
        if (viewedListingsString) {
          viewedListings = JSON.parse(viewedListingsString);
          if (!Array.isArray(viewedListings)) viewedListings = [];
        }
      } catch (e) {
        console.error('Error reading viewed listings from localStorage:', e);
      }
    }
    
    const filteredListings = listings 
      // Filter out any properties with removed flag
      .filter((listing) => !listing.removed)
      .filter((listing) => !listing.isDuplicate)
      // Filter to only show favorite listings if showOnlyFavorites is true
      .filter((listing) => {
        if (filterState.showOnlyFavorites) {
          return listing.id && favorites.includes(listing.id);
        }
        return true;
      })
      // Filter for viewed listings if that option is enabled
      .filter((listing) => {
        if (filterState.showOnlySeen) {
          return listing.id && viewedListings.includes(listing.id);
        }
        return true;
      })
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
          return !isListingSold;
        } else if (showSold) {
          // Only show sold listings
          return isListingSold;
        } else {
          // If neither is selected (edge case), show nothing
          return false;
        }
      })
      // Mark listings as hidden if they're in the hiddenListings array
      .map(listing => ({
        ...listing,
        isHidden: listing.id ? hiddenListings.includes(listing.id) : false
      }));

    // First sort by the selected sort option
    const sortedListings = filteredListings.sort((a, b) => {
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
        case 'newest': {
          // For newest, assume listings with higher IDs are newer
          // If you have timestamps, use those instead
          const idA = parseInt(a.id || '0', 10);
          const idB = parseInt(b.id || '0', 10);
          return idB - idA; // Descending order (newest first)
        }
        default:
          // Default to newest if no valid sort option
          const idA = parseInt(a.id || '0', 10);
          const idB = parseInt(b.id || '0', 10);
          return idB - idA;
      }
    });
    
    // Then prioritize non-hidden listings
    const finalListings = sortedListings.sort((a, b) => {
      // Check if listings have been marked as hidden in localStorage
      const aHidden = hiddenListings.includes(a.id || '');
      const bHidden = hiddenListings.includes(b.id || '');
      
      // If one is hidden and the other isn't, put the non-hidden one first
      if (aHidden && !bHidden) return 1;
      if (!aHidden && bHidden) return -1;
      return 0; // Otherwise keep the original sort order
    });

    // Flag that we should update the cache
    shouldUpdateCacheRef.current = true;
    return finalListings;
  }, [listings, filterState, isReady, favorites, displayState.sortBy, isLoading, hiddenListings]);

  // Second run - update state in an effect, but only if computedListings has changed
  useEffect(() => {
    if (computedListings && shouldUpdateCacheRef.current) {
      setCachedListings(computedListings);
      shouldUpdateCacheRef.current = false;
    }
  }, [computedListings]);

  // Final memoized value - use either computed or cached listings
  const filteredAndSortedListings = useMemo(() => {
    return computedListings || cachedListings;
  }, [computedListings, cachedListings]);

  const handleResetFilters = () => {
    // Reset to default filter state using the imported defaultFilterState
    setFilterState(defaultFilterState);
  };

  // Extract NoResults into a memoized component outside of the render logic
  const NoResults = useMemo(() => {
    return () => {
      // If showing favorites but none are valid, show appropriate message
      if (filterState.showOnlyFavorites) {
        const validCount = getValidFavoritesCount(favorites, listings || []);
        
        if (validCount === 0) {
          return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <p className="text-lg font-medium">
                {favorites.length > 0 
                  ? "None of your favorited properties meet the display criteria" 
                  : "You haven't added any favorites yet"}
              </p>
              <p className="text-muted-foreground">
                {favorites.length > 0 
                  ? "Your favorites may not have valid location data or may have been removed"
                  : "Browse listings and click the heart icon to save favorites"}
              </p>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="mt-4"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Show All Listings
              </Button>
            </div>
          );
        }
      }
      
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
  }, [filterState, handleResetFilters, filteredAndSortedListings, favorites, listings]);

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

  // Add a function to handle clicking on a property
  const handlePropertyClick = (listing: Listing) => {
    if (onSelectProperty && listing.id) {
      onSelectProperty(listing.id);
    }
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
    
    if (!listing) {
      return null;
    }
    
    // Check if listing is in the hidden list
    const isHiddenListing = hiddenListings.includes(listing.id || '');
    
    // Get padding
    const paddingAmount = getPadding();
    
    // Add padding to the style
    const paddedStyle = {
      ...style,
      width: `calc(100% - ${paddingAmount * 2}px)`,
      height: `calc(100% - ${paddingAmount * 2}px)`,
      left: style.left as number + paddingAmount,
      top: style.top as number + paddingAmount,
    };
    
    // Pass only the boolean flag to the ListingBox component
    return (
      <div key={key} style={Object.assign({}, style, { padding: getPadding() })} className="outline-none">
        <ListingBox 
          property={listing} 
          handleLightboxOpen={() => {}}
          onClick={() => handlePropertyClick(listing)}
          isHidden={isHiddenListing}
        />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load listings" message={error.message} />;
  }

  if (!isReady) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingListingCard key={index} />
          ))}
        </div>
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