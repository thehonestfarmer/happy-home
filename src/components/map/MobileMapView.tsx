"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MapDisplay } from "./MapPlaceholder";
import { ListingsGrid } from "../listings/ListingsGrid";
import { useListings } from "@/contexts/ListingsContext";
import { ListingBox } from "../listings/ListingBox";
import { Button } from "@/components/ui/button";
import { Map, List, X, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence, PanInfo, useMotionValue } from "framer-motion";
import { Listing } from "@/lib/listing-utils";
import { useAppContext } from "@/AppContext";
import { getValidFavoritesCount } from "@/lib/favorites-utils";

export function MobileMapView({ maintainMapPosition = false }) {
  // View mode: 'map' or 'list'
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  // Selected listing to show in the drawer
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  // Whether the listing drawer is open
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Selected property ID for the map (separate from selectedListing)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  // Current zoom level
  const [currentZoom, setCurrentZoom] = useState(10);
  
  // For drag gesture handling
  const y = useMotionValue(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // Get listings from context
  const { listings, isLoading } = useListings();
  // Get filter state and favorites from app context
  const { filterState, favorites, isReady } = useAppContext();
  
  // Ref to track if localStorage has been checked
  const hasCheckedStorage = useRef(false);
  
  // Store the previously filtered listings to prevent unnecessary re-renders
  const [localFilteredListings, setLocalFilteredListings] = useState<Listing[]>([]);
  
  // Effect to initialize viewed listings from localStorage on component mount
  useEffect(() => {
    // Only run once on mount
    if (hasCheckedStorage.current) return;
    
    // Mark as checked
    hasCheckedStorage.current = true;
    
    if (!isReady) {
      // Context is not yet ready, don't try to filter listings
      return;
    }
    
    // Filter will happen in the useMemo below
  }, [isReady]);
  
  // Filter listings based on the current filter state
  const filteredListings = useMemo(() => {
    if (!listings || !isReady) return localFilteredListings;
    
    // Get viewed listings from localStorage
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
      
      // Filter by viewed listings if enabled
      if (filterState.showOnlySeen) {
        // Only show listings that have been viewed
        if (!viewedListings.includes(listing.id)) return false;
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
    
    // Return filtered results without updating state here
    return filtered;
  }, [listings, filterState, favorites, isReady]);
  
  // Update the local filtered listings in a separate useEffect
  useEffect(() => {
    if (filteredListings.length > 0) {
      setLocalFilteredListings(filteredListings);
    }
  }, [filteredListings]);
  
  // Handler for when a pin is selected on the map
  const handlePinSelect = (listing: Listing) => {
    setSelectedListing(listing);
    setSelectedPropertyId(listing.id || null);
    setIsDrawerOpen(true);
  };
  
  // Handle zoom in action
  const handleZoomIn = () => {
    setCurrentZoom((prevZoom) => Math.min(prevZoom + 1, 18)); // Max zoom is typically 18-20 for Mapbox
  };
  
  // Handle zoom out action
  const handleZoomOut = () => {
    setCurrentZoom((prevZoom) => Math.max(prevZoom - 1, 5)); // Min zoom to avoid zooming out too far
  };
  
  // Update current zoom level when map is moved
  const handleMapMove = (evt: any) => {
    setCurrentZoom(evt.viewState.zoom);
  };
  
  // Toggle view mode between map and list
  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'list' : 'map');
    // Close the drawer when switching views
    closeDrawer();
  };
  
  // Close the drawer and clear selected pin
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    // Clear selected listing after a slight delay to allow for animation
    setTimeout(() => {
      setSelectedListing(null);
      // Don't clear selectedPropertyId anymore to maintain map position
      // This allows the pin to stay selected and the map to maintain its view
      // setSelectedPropertyId(null); // This line is removed
    }, 300);
  };
  
  // Handle drawer drag events
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged down more than 100px, close the drawer
    if (info.offset.y > 100) {
      closeDrawer();
    } else {
      // Snap back to original position
      y.set(0);
    }
  };

  // Map skeleton loader component
  const MapSkeleton = () => (
    <div className="w-full h-[calc(100vh-110px)] bg-gray-100 relative overflow-hidden">
      {/* Skeleton animation overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse opacity-75"></div>
      
      {/* Fake map elements */}
      <div className="absolute top-4 left-4 h-10 w-10 rounded-md bg-white shadow-md"></div>
      <div className="absolute top-4 right-4 h-8 w-32 rounded-md bg-white shadow-md"></div>
      
      {/* Fake pins */}
      <div className="absolute top-1/4 left-1/3 h-6 w-16 rounded bg-gray-200 shadow-sm"></div>
      <div className="absolute top-2/4 left-1/2 h-6 w-16 rounded bg-gray-200 shadow-sm"></div>
      <div className="absolute top-1/3 left-2/3 h-6 w-16 rounded bg-gray-200 shadow-sm"></div>
      <div className="absolute top-3/5 left-1/4 h-6 w-16 rounded bg-gray-200 shadow-sm"></div>
      
      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white bg-opacity-90 rounded-lg shadow-lg p-4 px-6 text-center">
          <div className="h-6 w-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-medium">Loading ⚡</p>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="relative w-full h-full">
      {/* Map View */}
      {viewMode === 'map' && (
        <div className="w-full h-[calc(100vh-110px)]">
          {isLoading || !isReady ? (
            <MapSkeleton />
          ) : (
            <MapDisplay 
              onPinSelect={handlePinSelect}
              isMobileView={true}
              selectedPropertyId={selectedPropertyId} 
              singlePropertyMode={selectedListing !== null} 
              customZoom={currentZoom} 
              onMove={handleMapMove} 
              currentRoute="/listings" 
              maintainMapPosition={maintainMapPosition}
              listings={filteredListings} // Pass filtered listings to the map
            />
          )}

          {/* Zoom controls - fixed on the right side */}
          <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
            <Button
              onClick={handleZoomIn}
              className="h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 border border-gray-200 text-gray-700"
              variant="outline"
              size="icon"
              aria-label="Zoom In"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
              <span className="sr-only">Zoom In</span>
            </Button>
            
            <Button
              onClick={handleZoomOut}
              className="h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 border border-gray-200 text-gray-700"
              variant="outline"
              size="icon"
              aria-label="Zoom Out"
            >
              <Minus className="h-6 w-6" strokeWidth={2.5} />
              <span className="sr-only">Zoom Out</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* List View */}
      {viewMode === 'list' && (
        <div className="w-full">
          <ListingsGrid />
        </div>
      )}
      
      {/* Floating Action Button for toggling views - centered and positioned above bottom nav */}
      <div className="fixed bottom-20 inset-x-0 flex justify-center z-40">
        <Button
          onClick={toggleViewMode}
          className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          {viewMode === 'map' ? (
            <List className="h-6 w-6 text-white" />
          ) : (
            <Map className="h-6 w-6 text-white" />
          )}
          <span className="sr-only">
            {viewMode === 'map' ? 'Show List View' : 'Show Map View'}
          </span>
        </Button>
      </div>
      
      {/* Bottom Drawer for Selected Listing */}
      <AnimatePresence>
        {isDrawerOpen && selectedListing && (
          <>
            {/* Backdrop - clicking this closes the drawer */}
            <motion.div
              className="fixed inset-0 bg-black/25 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
            />
            
            {/* Drawer panel */}
            <motion.div
              ref={drawerRef}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl max-h-[80vh] overflow-hidden touch-none"
              style={{ y }} 
              drag="y"
              dragConstraints={{ top: 0 }}
              onDragEnd={handleDragEnd}
              dragElastic={0.2}
              dragMomentum={true}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
                bounce: 0,
                restDelta: 0.001,
                restSpeed: 0.001,
                delay: 0.08,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer handle */}
              <div className="flex flex-col items-center sticky top-0 bg-white z-10 touch-none">
                
                <div className="flex items-center justify-end w-full px-4 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDrawer();
                    }}
                    className="h-8 w-8 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
              </div>
              
              {/* Listing Box - wrap in scrollable container */}
              <div className="px-4 pb-8 overflow-y-auto touch-auto" 
                   style={{ maxHeight: 'calc(80vh - 60px)' }}
                   onTouchStart={(e) => e.stopPropagation()}>
                <ListingBox 
                  property={selectedListing} 
                  handleLightboxOpen={() => {}}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 