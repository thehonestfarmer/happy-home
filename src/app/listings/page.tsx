"use client";

import { useState, useEffect, useMemo } from "react";
import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { ListingsMapView } from "@/components/map/ListingsMapView";
import { MobileMapView } from "@/components/map/MobileMapView";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilterHeader } from "@/components/listings/MobileFilterHeader";
import Header from "../header";
import { Listing, parseJapanesePrice, convertCurrency, parseLayout } from "@/lib/listing-utils";
import { useAppContext } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";

export default function ListingsPage() {
  // Add state to track selected listing
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showPropertyPopup, setShowPropertyPopup] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(10);
  // Change default to false so map will auto-position on first load
  const [maintainMapPosition, setMaintainMapPosition] = useState(false);
  // Add state to track device view
  const [isMobileView, setIsMobileView] = useState(false);

  // Get filter state and favorites from AppContext
  const { filterState, favorites, isReady } = useAppContext();
  // Get listings from the ListingsContext
  const { listings, isLoading } = useListings();
  
  // Store the previously filtered listings to prevent flickering
  const [cachedFilteredListings, setCachedFilteredListings] = useState<Listing[]>([]);

  // Filter listings based on the current filter state
  const filteredListings = useMemo(() => {
    // If context is not ready or listings are loading, return cached results
    if (!isReady || !listings || listings.length === 0) {
      return cachedFilteredListings;
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

    const filtered = listings.filter(listing => {
      // Skip if invalid listing
      if (!listing) return false;
      
      // Filter by favorites if enabled
      if (filterState.showOnlyFavorites) {
        // Only show favorites
        if (!favorites.includes(listing.id)) return false;
      }
      
      // Apply for sale/sold filters
      if (filterState.showForSale && !filterState.showSold) {
        // Show only for sale
        if (listing.isSold) return false;
      } else if (!filterState.showForSale && filterState.showSold) {
        // Show only sold
        if (!listing.isSold) return false;
      } else if (!filterState.showForSale && !filterState.showSold) {
        // Edge case - nothing selected
        return false;
      }
      
      // Add viewed listings filter
      if (filterState.showOnlySeen) {
        if (!viewedListings.includes(listing.id)) return false;
      }

      // Apply price range filter
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
      
      // Apply layout filter
      if (filterState.layout.minLDK) {
        const layoutNumber = parseLayout(listing.layout);
        if (layoutNumber < filterState.layout.minLDK) {
          return false;
        }
      }
      
      // Apply size filters
      if (filterState.size.minBuildSize && listing.buildSqMeters) {
        const buildSize = typeof listing.buildSqMeters === 'string' 
          ? parseFloat(listing.buildSqMeters) 
          : listing.buildSqMeters;
        if (buildSize < filterState.size.minBuildSize) {
          return false;
        }
      }
      
      if (filterState.size.maxBuildSize && listing.buildSqMeters) {
        const buildSize = typeof listing.buildSqMeters === 'string' 
          ? parseFloat(listing.buildSqMeters) 
          : listing.buildSqMeters;
        if (buildSize > filterState.size.maxBuildSize) {
          return false;
        }
      }
      
      if (filterState.size.minLandSize && listing.landSqMeters) {
        const landSize = typeof listing.landSqMeters === 'string' 
          ? parseFloat(listing.landSqMeters) 
          : listing.landSqMeters;
        if (landSize < filterState.size.minLandSize) {
          return false;
        }
      }
      
      if (filterState.size.maxLandSize && listing.landSqMeters) {
        const landSize = typeof listing.landSqMeters === 'string' 
          ? parseFloat(listing.landSqMeters) 
          : listing.landSqMeters;
        if (landSize > filterState.size.maxLandSize) {
          return false;
        }
      }
      
      // If we get here, listing passes all filters
      return true;
    });
    
    // Return filtered results without updating the state here
    return filtered;
  }, [listings, filterState, favorites, isReady]);

  // Update the cached listings in a separate useEffect
  useEffect(() => {
    // Only update if we have results (avoid initial empty state)
    if (filteredListings.length > 0) {
      setCachedFilteredListings(filteredListings);
    }
  }, [filteredListings]);

  // Check if we're in mobile view on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobileView(window.innerWidth < 1024); // 1024px is the 'lg' breakpoint in Tailwind
      };
      
      // Check on mount
      checkMobile();
      
      // Add resize listener
      window.addEventListener('resize', checkMobile);
      
      // Clean up
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []); // Empty dependency array to run only on mount

  // Handler for map movement
  const handleMapMove = (evt: any) => {
    // When user manually moves the map, set the flag to maintain this position
    setMaintainMapPosition(true);
    setCurrentZoom(evt.viewState.zoom);
  };

  // Handler for selecting a property from the grid
  const handleSelectProperty = (id: string | null) => {
    // Set the maintain position flag to true to keep current map position
    setMaintainMapPosition(true);
    setSelectedPropertyId(id);
    
    // Only hide property popup in mobile view
    // In desktop view, we want to show both the drawer and the popup
    if (isMobileView) {
      setShowPropertyPopup(false);
    } else {
      setShowPropertyPopup(true); // Explicitly show popup in desktop view
    }
  };

  // New handler specifically for map pin selection
  const handlePinSelect = (listing: Listing) => {
    // When a pin is clicked on the map
    setSelectedPropertyId(listing.id || null);
    setMaintainMapPosition(true);
    
    // In desktop view, we want to show the popup
    if (!isMobileView) {
      setShowPropertyPopup(true);
    } else {
      // In mobile view, we don't show popups, only drawer
      setShowPropertyPopup(false);
    }
  };

  // Handler for toggling property popup
  const handlePropertyPopupToggle = (isVisible: boolean) => {
    setShowPropertyPopup(isVisible);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
        
      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Mobile Filter Header - only visible on mobile and explicitly sticky */}
        <div className="lg:hidden sticky top-0 z-30">
          <MobileFilterHeader />
        </div>

        {FeatureFlags.showMap ? (
          <>
            {/* Show loading indicator when not ready */}
            {!isReady && (
              <div className="w-full h-[calc(100vh-150px)] flex items-center justify-center">
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                  <div className="h-8 w-8 border-2 border-t-green-600 border-gray-300 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-700 font-medium">Loading your filters...</p>
                </div>
              </div>
            )}
            
            {/* Mobile View - Full Map with toggle */}
            {isReady && (
              <div className="lg:hidden w-full">
                <MobileMapView 
                  maintainMapPosition={maintainMapPosition} 
                  listings={filteredListings}
                />
              </div>
            )}

            {/* Desktop View - Side by side layout */}
            {isReady && (
              <div className="hidden lg:flex lg:flex-row w-full">
                {/* Listings section - pass onSelectProperty callback */}
                <div className="lg:w-7/12 lg:max-w-[960px]">
                  <ListingsGrid onSelectProperty={handleSelectProperty} listings={filteredListings} />
                </div>

                {/* Map section - pass selected property information */}
                <div className="lg:w-5/12 lg:flex-1">
                  {/* Note: currentRoute="/listings" is automatically set in ListingsMapView */}
                  <ListingsMapView 
                    selectedPropertyId={selectedPropertyId}
                    singlePropertyMode={selectedPropertyId !== null}
                    showPropertyPopup={showPropertyPopup}
                    onPropertyPopupToggle={handlePropertyPopupToggle}
                    customZoom={currentZoom}
                    onMove={handleMapMove}
                    maintainMapPosition={maintainMapPosition}
                    onPinSelect={handlePinSelect}
                    isMobileView={isMobileView}
                    listings={filteredListings}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          // If map feature is disabled, just show listings grid on all screens
          <div className="w-full">
            <ListingsGrid onSelectProperty={handleSelectProperty} />
          </div>
        )}
      </main>
    </div>
  );
} 