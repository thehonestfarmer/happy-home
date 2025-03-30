"use client";

import { useState, useEffect, useMemo } from "react";
import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { ListingsMapView } from "@/components/map/ListingsMapView";
import { MobileMapView } from "@/components/map/MobileMapView";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilterHeader } from "@/components/listings/MobileFilterHeader";
import Header from "../header";
import { Listing } from "@/lib/listing-utils";
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
  const { filterState, favorites } = useAppContext();
  // Get listings from the ListingsContext
  const { listings, isLoading } = useListings();

  // Filter listings based on the current filter state
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.filter(listing => {
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
      
      // If we get here, listing passes all filters
      return true;
    });
  }, [listings, filterState, favorites]);

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
            {/* Mobile View - Full Map with toggle */}
            <div className="lg:hidden w-full">
              <MobileMapView maintainMapPosition={maintainMapPosition} />
            </div>

            {/* Desktop View - Side by side layout */}
            <div className="hidden lg:flex lg:flex-row w-full">
              {/* Listings section - pass onSelectProperty callback */}
              <div className="lg:w-7/12 lg:max-w-[960px]">
                <ListingsGrid onSelectProperty={handleSelectProperty} />
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