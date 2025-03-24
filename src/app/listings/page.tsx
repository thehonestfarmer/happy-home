"use client";

import { useState } from "react";
import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { ListingsMapView } from "@/components/map/ListingsMapView";
import { MobileMapView } from "@/components/map/MobileMapView";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilterHeader } from "@/components/listings/MobileFilterHeader";
import Header from "../header";
import { Listing } from "@/lib/listing-utils";

export default function ListingsPage() {
  // Add state to track selected listing
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showPropertyPopup, setShowPropertyPopup] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(10);
  // Change default to false so map will auto-position on first load
  const [maintainMapPosition, setMaintainMapPosition] = useState(false);

  // Handler for map movement
  const handleMapMove = (evt: any) => {
    // When user manually moves the map, set the flag to maintain this position
    setMaintainMapPosition(true);
    setCurrentZoom(evt.viewState.zoom);
  };

  // Handler for selecting a property
  const handleSelectProperty = (id: string | null) => {
    // Set the maintain position flag to true to keep current map position
    setMaintainMapPosition(true);
    setSelectedPropertyId(id);
    // Don't show property popup by default when selecting from the listings page
    // This prevents the popup from appearing and makes sure only the drawer is shown
    setShowPropertyPopup(false);
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