"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Map as ReactMapGL, Marker, Popup, ViewStateChangeEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useListings } from '@/contexts/ListingsContext';
import { useAppContext } from '@/AppContext';
import { Loader2, Train } from 'lucide-react';
import { parseJapanesePrice, convertCurrency, parseLayout, Listing } from '@/lib/listing-utils';
import type { MapLayerMouseEvent } from 'mapbox-gl';
import { usePathname, useRouter } from 'next/navigation';

// Access token with fallback to prevent TypeScript errors
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/**
 * AnchorStyle is an important style hack that adds dynamic CSS for popup positioning
 * based on the computed anchor value from determinePopupAnchor.
 */
function AnchorStyle({ anchor }: { anchor: string }) {
  if (anchor.includes('left')) {
    return (
      <style jsx global>{`
        .map-popup {
          left: 2rem !important;
        }
      `}</style>
    );
  }

  if (anchor.includes('right')) {
    return (
      <style jsx global>{`
        .map-popup {
          left: -2rem !important;
        }
      `}</style>
    );
  }

  if (anchor.includes('top')) {
    return (
      <style jsx global>{`
        .map-popup {
          top: 2rem !important;
        }
      `}</style>
    );
  }

  if (anchor.includes('bottom')) {
    return (
      <style jsx global>{`
        .map-popup {
          top: -2rem !important;
        }
      `}</style>
    );
  }

  return null;
}

// Note: Popup positioning is now handled by the determinePopupAnchor function

// Shinkansen stations from Tokyo to Niigata with verified coordinates
const shinkansenStations = [
  { name: "Tokyo", coordinates: [139.7644909, 35.6812996] },
  { name: "Omiya", coordinates: [139.6214374, 35.9060296] },
  { name: "Kumagaya", coordinates: [139.3853, 36.1393899] },
  { name: "Takasaki", coordinates: [139.0100874, 36.3228267] },
  { name: "Echigo-Yuzawa", coordinates: [138.8070586, 36.9359839] },
  { name: "Urasa", coordinates: [138.9202298, 37.1674363] },
  { name: "Nagaoka", coordinates: [138.8514718, 37.448014] },
  { name: "Niigata", coordinates: [139.0617, 37.9122] }
];

// Generate points between two coordinates for line rendering
function generateIntermediatePoints(start: [number, number], end: [number, number], count: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= count; i++) {
    const ratio = i / count;
    const lng = start[0] + ratio * (end[0] - start[0]);
    const lat = start[1] + ratio * (end[1] - start[1]);
    points.push([lng, lat]);
  }
  return points;
}

// Generate all points for the Shinkansen route
function generateShinkansenRoute(): [number, number][] {
  const allPoints: [number, number][] = [];

  // For each pair of adjacent stations, generate intermediate points
  for (let i = 0; i < shinkansenStations.length - 1; i++) {
    const start = shinkansenStations[i].coordinates as [number, number];
    const end = shinkansenStations[i + 1].coordinates as [number, number];

    // Calculate distance between stations to determine how many points to generate
    const latDist = Math.abs(start[1] - end[1]);
    const lngDist = Math.abs(start[0] - end[0]);
    const dist = Math.sqrt(latDist * latDist + lngDist * lngDist);

    // Use more points for longer segments
    const pointCount = Math.max(10, Math.round(dist * 100));

    // Generate points and add to the route
    const segmentPoints = generateIntermediatePoints(start, end, pointCount);
    allPoints.push(...segmentPoints);
  }

  return allPoints;
}

// Pre-calculate all route points
const shinkansenRoutePoints = generateShinkansenRoute();

/**
 * Determines the optimal anchor position for a popup based on its position relative to viewport,
 * nearby elements, device type, and other factors.
 *
 * @param coords - Coordinates of the element the popup is attached to
 * @param viewportCenter - Current center coordinates of the viewport
 * @param zoom - Current zoom level
 * @param isMobileView - Whether we're in mobile view
 * @param nearbyElementInfo - Optional info about nearby element to avoid overlap
 * @param singleElementMode - Whether we're in single element display mode
 * @returns The optimal anchor position for the popup
 */
function determinePopupAnchor(
  coords: { lat: number; lng: number },
  viewportCenter: { lat: number; lng: number },
  zoom: number,
  isMobileView: boolean,
  nearbyElementInfo?: { coords: { lat: number; lng: number }; type: 'station' | 'property' } | null,
  singleElementMode: boolean = false
): "bottom" | "top" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" {
  // Calculate factors for viewport edges detection - adjusts based on zoom level
  const viewportWidthFactor = (isMobileView ? 0.4 : 0.3) * (zoom / 10);
  const viewportHeightFactor = (isMobileView ? 0.3 : 0.25) * (zoom / 10);
  
  // Check if element is near viewport edges
  const isNearLeft = coords.lng < (viewportCenter.lng - viewportWidthFactor * 0.6);
  const isNearRight = coords.lng > (viewportCenter.lng + viewportWidthFactor * 0.6);
  const isNearTop = coords.lat > (viewportCenter.lat + viewportHeightFactor * 0.7);
  const isNearBottom = coords.lat < (viewportCenter.lat - viewportHeightFactor * 0.7);
  
  // Determine proximity to viewport edges (for extreme cases)
  const isVeryNearLeft = coords.lng < (viewportCenter.lng - viewportWidthFactor * 0.85);
  const isVeryNearRight = coords.lng > (viewportCenter.lng + viewportWidthFactor * 0.85);
  
  // Check if nearby element might overlap
  const isCloseToNearbyElement = nearbyElementInfo ? 
    Math.abs(coords.lat - nearbyElementInfo.coords.lat) < 0.05 &&
    Math.abs(coords.lng - nearbyElementInfo.coords.lng) < 0.05 
    : false;
  
  // Determine optimal anchor
  if (isMobileView) {
    // On mobile, prioritize horizontal positioning for edge cases
    if (isVeryNearLeft) {
      return "left"; // Position popup extending to the right when near left edge
    } else if (isVeryNearRight) {
      return "right"; // Position popup extending to the left when near right edge
    } else if (isNearTop) {
      return "top"; // Below the marker
    } else {
      return "bottom"; // Above the marker (default for mobile)
    }
  } else if (singleElementMode) {
    if (isCloseToNearbyElement && nearbyElementInfo) {
      // If close to nearby element, position opposite to avoid overlap
      const isNearbyElementToLeft = nearbyElementInfo.coords.lng < coords.lng;
      const isNearbyElementAbove = nearbyElementInfo.coords.lat > coords.lat;
      
      if (isNearbyElementToLeft) {
        return isNearbyElementAbove ? "bottom-right" : "top-right";
      } else {
        return isNearbyElementAbove ? "bottom-left" : "top-left";
      }
    } 
    // Prioritize edge positioning to prevent cutoff
    else if (isVeryNearLeft) {
      return isNearTop ? "top-left" : isNearBottom ? "bottom-left" : "left";
    } else if (isVeryNearRight) {
      return isNearTop ? "top-right" : isNearBottom ? "bottom-right" : "right";
    } else if (isNearLeft && isNearTop) {
      return "top-left";
    } else if (isNearRight && isNearTop) {
      return "top-right";
    } else if (isNearLeft && isNearBottom) {
      return "bottom-left";
    } else if (isNearRight && isNearBottom) {
      return "bottom-right";
    } else if (isNearLeft) {
      return "left"; // Position popup extending to the right
    } else if (isNearRight) {
      return "right"; // Position popup extending to the left
    } else if (isNearTop) {
      return "top";
    } else if (isNearBottom) {
      return "bottom";
    } else {
      // Default logic for single element mode when not near edges
      const isToTheLeft = coords.lng < viewportCenter.lng;
      return isToTheLeft ? "right" : "left";
    }
  } else {
    // Default desktop positioning for non-single element mode
    // Use more natural positioning based on location in viewport
    if (isNearLeft) return "left";
    if (isNearRight) return "right";
    if (isNearTop) return "top";
    if (isNearBottom) return "bottom";
    
    // Default to left/right based on position relative to center
    return coords.lng < viewportCenter.lng ? "right" : "left";
  }
}

// Function to check if a listing has been viewed
const hasViewedListing = (listingId: string | undefined): boolean => {
  if (typeof window === 'undefined' || !listingId) return false;

  try {
    // Get viewed listings from localStorage
    const viewedListingsString = localStorage.getItem('viewedListings');
    if (!viewedListingsString) return false;

    // Parse viewed listings array
    const viewedListings = JSON.parse(viewedListingsString);
    return Array.isArray(viewedListings) && viewedListings.includes(listingId);
  } catch (error) {
    console.error('Error checking viewed listings:', error);
    return false;
  }
};

// Add a function to mark a listing as viewed when it's clicked
const markListingAsViewed = (listingId: string | undefined): void => {
  if (typeof window === 'undefined' || !listingId) return;

  try {
    // Get existing viewed listings
    const viewedListingsString = localStorage.getItem('viewedListings');
    let viewedListings: string[] = [];

    if (viewedListingsString) {
      viewedListings = JSON.parse(viewedListingsString);
      if (!Array.isArray(viewedListings)) viewedListings = [];
    }

    // Add current listing if not already included
    if (!viewedListings.includes(listingId)) {
      viewedListings.push(listingId);
      // Store updated list back to localStorage
      localStorage.setItem('viewedListings', JSON.stringify(viewedListings));
    }
  } catch (error) {
    console.error('Error updating viewed listings:', error);
  }
};

// Export the interface so it can be used by other components
export interface MapDisplayProps {
  listings?: Listing[];
  hidePopup?: boolean;
  singlePropertyMode?: boolean;
  onPinSelect?: (listing: Listing) => void;
  isMobileView?: boolean;
  selectedPropertyId?: string | null;
  fullScreenMode?: boolean;
  customZoom?: number;
  onMove?: (evt: any) => void;
  selectedStation?: number | null;
  onStationSelect?: (stationIndex: number | null) => void;
  showPropertyPopup?: boolean;
  onPropertyPopupToggle?: (isVisible: boolean) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  currentRoute?: string;
  maintainMapPosition?: boolean;
  useSimpleMarker?: boolean;
}

// Define MapRef interface since it's not exported from react-map-gl
interface MapRef {
  getMap: () => mapboxgl.Map;
  [key: string]: any; // Allow other properties for flexibility
}

export function MapDisplay({
  listings: propListings,
  singlePropertyMode = false,
  hidePopup = false,
  onPinSelect,
  isMobileView = false,
  selectedPropertyId,
  fullScreenMode = false,
  customZoom,
  onMove,
  selectedStation: externalSelectedStation,
  onStationSelect,
  showPropertyPopup = true,
  onPropertyPopupToggle,
  initialLatitude,
  initialLongitude,
  currentRoute = '',
  maintainMapPosition = false,
  useSimpleMarker = false
}: MapDisplayProps) {
  const { listings: contextListings } = useListings();
  const { filterState, displayState } = useAppContext();
  const [latitude, setLatitude] = useState(initialLatitude || 35.6762); // Use initialLatitude if provided, otherwise default to Tokyo
  const [longitude, setLongitude] = useState(initialLongitude || 139.6503); // Use initialLongitude if provided
  const [zoom, setZoom] = useState(10);
  const [internalSelectedProperty, setInternalSelectedProperty] = useState<string | null>(null);
  // Add a new state to track popup visibility for desktop listings view separately from selection
  const [internalPopupVisible, setInternalPopupVisible] = useState<boolean>(true);
  const selectedProperty = selectedPropertyId !== undefined ? selectedPropertyId : internalSelectedProperty;
  // Calculate effective popup visibility based on either prop or internal state
  const effectiveShowPropertyPopup = onPropertyPopupToggle ? showPropertyPopup : internalPopupVisible;
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  // Use internal or external selected station state
  const [internalSelectedStation, setInternalSelectedStation] = useState<number | null>(null);
  // Use external selectedStation if provided, otherwise use internal state
  const selectedStation = externalSelectedStation !== undefined ? externalSelectedStation : internalSelectedStation;
  const [mapInstance, setMapInstance] = useState<MapRef | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Add a ref to track if a station selection is in progress
  const isStationSelectionInProgress = useRef(false);
  // Track the last selected station to prevent duplicate effects
  const lastSelectedStation = useRef<number | null>(null);
  // Track custom zoom prop changes
  const lastCustomZoom = useRef<number | undefined>(customZoom);
  // Track double tap events
  const lastTapTime = useRef<number>(0);
  const isDoubleTapZooming = useRef<boolean>(false);
  const initialTapPosition = useRef<{ x: number, y: number } | null>(null);

  // Add a ref to track if we're in fullscreen view
  const isFullScreenView = fullScreenMode;


  // Effect to update position when initialLatitude or initialLongitude props change
  useEffect(() => {
    if (initialLatitude !== undefined) {
      setLatitude(initialLatitude);
    }
    if (initialLongitude !== undefined) {
      setLongitude(initialLongitude);
    }
  }, [initialLatitude, initialLongitude]);

  // Effect to initialize customZoom on first render
  useEffect(() => {
    if (customZoom !== undefined && zoom === 10) { // Only set on first render when zoom is still default
      setZoom(customZoom);
    }
  }, []);

  // Effect to handle customZoom prop changes
  useEffect(() => {
    if (customZoom !== undefined && customZoom !== lastCustomZoom.current) {
      lastCustomZoom.current = customZoom;

      // Only update zoom state if selection is not in progress and not during double-tap zoom
      if (!isStationSelectionInProgress.current && !isDoubleTapZooming.current) {
        setZoom(customZoom);
      } else {
        console.log('[DEBUG-ZOOM] Ignoring customZoom update during selection or double-tap zoom');
      }
    }
  }, [customZoom, zoom]);

  // Improved map movement handler with better zoom preservation
  const handleMapMove = useCallback((evt: ViewStateChangeEvent) => {
    // Track the event source for debugging
    const eventSource = evt.originalEvent ?
      (evt.originalEvent as any).type || 'unknown' :
      'no-original-event';

    // Check if this is a gesture interaction (touch events)
    const isTouchEvent = eventSource.includes('touch');
    const hasZoomChanged = Math.abs(evt.viewState.zoom - zoom) > 0.1;

    // Detect potential double-tap zoom events
    if (isTouchEvent && hasZoomChanged) {
      if (!isDoubleTapZooming.current) {
        console.log('[DEBUG-ZOOM] Potential double-tap zoom detected:', {
          from: zoom,
          to: evt.viewState.zoom,
          eventSource
        });
        isDoubleTapZooming.current = true;

        // Reset the double-tap flag after a short delay
        setTimeout(() => {
          isDoubleTapZooming.current = false;
          console.log('[DEBUG-ZOOM] Double-tap zoom flag reset');
        }, 500);
      }
    }

    // Always update position data immediately for smooth panning
    setLatitude(evt.viewState.latitude);
    setLongitude(evt.viewState.longitude);

    // Skip intermediate moves for zoom updates
    if (evt.type !== 'moveend') {
      // Only update zoom if not during station selection
      if (!isStationSelectionInProgress.current) {
        setZoom(evt.viewState.zoom);
      }
      return;
    }

    // Check if this move event was caused by a station selection
    const isStationSelectionEvent = isStationSelectionInProgress.current;

    if (isStationSelectionEvent) {
      console.log('[DEBUG-ZOOM] Handling map move during station selection:', {
        eventType: evt.type,
        eventSource: eventSource,
        currentZoom: zoom,
        newZoom: evt.viewState.zoom,
        customZoom: customZoom,
        stationSelection: isStationSelectionInProgress.current,
        position: { lat: evt.viewState.latitude, lng: evt.viewState.longitude }
      });

      // During station selection, we've already updated position
      // Don't update zoom, and don't call the parent onMove to avoid affecting zoom controls
      return;
    }

    // For regular map movement, log and update everything
    console.log('[DEBUG-ZOOM] Regular map movement:', {
      eventType: evt.type,
      eventSource: eventSource,
      currentZoom: zoom,
      newZoom: evt.viewState.zoom,
      customZoom: customZoom,
      position: { lat: evt.viewState.latitude, lng: evt.viewState.longitude },
      isDoubleTapZoom: isDoubleTapZooming.current
    });

    // Update zoom for regular movements
    setZoom(evt.viewState.zoom);

    // Call the onMove callback if provided
    if (onMove) {
      onMove(evt);
    }
  }, [zoom, onMove, customZoom]);

  // Handle map touch events for double-tap detection
  const handleMapTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      const timeDiff = now - lastTapTime.current;

      // Store touch position
      initialTapPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      // Check for double tap (time between taps < 300ms)
      if (timeDiff < 300) {
        console.log('[DEBUG-ZOOM] Double tap detected');
        isDoubleTapZooming.current = true;

        // Reset the double-tap flag after processing completes
        setTimeout(() => {
          isDoubleTapZooming.current = false;
          console.log('[DEBUG-ZOOM] Double-tap zoom flag reset after processing');
        }, 1000);
      }

      lastTapTime.current = now;
    }
  }, []);

  // Use provided listings or context listings
  const sourceListings = propListings || contextListings || [];

  // Filter listings to match exactly the same logic as in ListingsGrid
  const filteredListings = useMemo(() => {
    // If in single property mode, don't apply filters
    if (singlePropertyMode) {
      return sourceListings;
    }

    if (!sourceListings.length) return [];

    return sourceListings
      .filter((listing) => !listing.isDuplicate)
      .filter((listing) => {
        // Only include listings with coordinates
        if (!listing.coordinates?.lat || !listing.coordinates?.long) {
          return false;
        }
        return true;
      })
      .filter((listing) => {
        // Price filter
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
        // Layout filter (LDK)
        if (filterState.layout.minLDK) {
          const layoutNumber = parseLayout(listing.layout);
          if (layoutNumber < filterState.layout.minLDK) {
            return false;
          }
        }
        return true;
      })
      .filter((listing) => {
        // Building size filters
        if (filterState.size.minBuildSize && listing.buildSqMeters) {
          const buildSize = parseFloat(listing.buildSqMeters);
          if (!isNaN(buildSize) && buildSize < filterState.size.minBuildSize) {
            return false;
          }
        }
        if (filterState.size.maxBuildSize && listing.buildSqMeters) {
          const buildSize = parseFloat(listing.buildSqMeters);
          if (!isNaN(buildSize) && buildSize > filterState.size.maxBuildSize) {
            return false;
          }
        }
        return true;
      })
      .filter((listing) => {
        // Land size filters
        if (filterState.size.minLandSize && listing.landSqMeters) {
          const landSize = parseFloat(listing.landSqMeters);
          if (!isNaN(landSize) && landSize < filterState.size.minLandSize) {
            return false;
          }
        }
        if (filterState.size.maxLandSize && listing.landSqMeters) {
          const landSize = parseFloat(listing.landSqMeters);
          if (!isNaN(landSize) && landSize > filterState.size.maxLandSize) {
            return false;
          }
        }
        return true;
      })
      .filter((listing) => {
        // For Sale / Sold filter
        const showForSale = filterState.showForSale !== false; // Default to true
        const showSold = filterState.showSold === true; // Default to false

        // Normalize the isSold property
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
      });
  }, [
    sourceListings,
    filterState.showForSale,
    filterState.showSold,
    filterState.priceRange.min,
    filterState.priceRange.max,
    filterState.layout.minLDK,
    filterState.size.minBuildSize,
    filterState.size.maxBuildSize,
    filterState.size.minLandSize,
    filterState.size.maxLandSize,
    singlePropertyMode
  ]);

  // Auto-adjust map view based on visible listings
  useEffect(() => {
    // Skip auto-positioning if we have explicit initial coordinates
    if (initialLatitude !== undefined && initialLongitude !== undefined) {
      return;
    }

    // Skip auto-positioning if maintainMapPosition is true - this prevents the map from
    // repositioning when the drawer closes or when the user has manually moved the map
    if (maintainMapPosition) {
      return;
    }

    // Add this check: Skip auto-positioning when a property is selected but not in full screen mode
    // This prevents the map from repositioning when selecting a property from the listings page
    if (selectedProperty && !fullScreenMode) {
      return;
    }

    if (filteredListings.length > 0) {
      // Calculate bounds from all visible properties
      const bounds = filteredListings.reduce(
        (acc, listing) => {
          if (listing.coordinates?.lat && listing.coordinates?.long) {
            acc.minLat = Math.min(acc.minLat, listing.coordinates.lat);
            acc.maxLat = Math.max(acc.maxLat, listing.coordinates.lat);
            acc.minLng = Math.min(acc.minLng, listing.coordinates.long);
            acc.maxLng = Math.max(acc.maxLng, listing.coordinates.long);
          }
          return acc;
        },
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );

      // Only adjust if we have valid bounds
      if (bounds.minLat < 90) {
        // For single property mode, we want to show Tokyo in relation to the property
        if (singlePropertyMode) {
          // Define Tokyo coordinates
          const tokyoLat = 35.6762;
          const tokyoLng = 139.6503;
          const propertyLat = bounds.minLat; // Using minLat as the property latitude
          const propertyLng = bounds.minLng; // Using minLng as the property longitude

          // Calculate distance to Tokyo in degrees
          const latDist = Math.abs(tokyoLat - propertyLat);
          const lngDist = Math.abs(tokyoLng - propertyLng);
          const maxDist = Math.max(latDist, lngDist);

          // Instead of centering on the property, center on a point between Tokyo and the property
          // Weight the center point to ensure both Tokyo and the property are visible
          let centerLat, centerLng;

          // If property is very far from Tokyo, use a weighted average to ensure both are visible
          if (maxDist > 0.5) {
            // Weight more toward the midpoint for distant properties
            centerLat = (tokyoLat + propertyLat) / 2;
            centerLng = (tokyoLng + propertyLng) / 2;
          } else {
            // For closer properties, weight slightly toward Tokyo to ensure it's visible
            centerLat = (tokyoLat * 0.4 + propertyLat * 0.6);
            centerLng = (tokyoLng * 0.4 + propertyLng * 0.6);
          }

          // Set the map center to our calculated point
          setLatitude(centerLat);
          setLongitude(centerLng);

          // Adjust zoom based on distance to Tokyo - use more zoomed out values
          if (maxDist > 1.0) setZoom(6); // Very far away, show very wide regional context
          else if (maxDist > 0.5) setZoom(7); // Far from Tokyo, show wide regional context
          else if (maxDist > 0.2) setZoom(8); // Medium distance, show prefecture-level context
          else setZoom(8.5); // Closer to Tokyo, show city-level context but ensure both are visible
        } else {
          // For multiple properties, center on the average position of all properties
          setLatitude((bounds.minLat + bounds.maxLat) / 2);
          setLongitude((bounds.minLng + bounds.maxLng) / 2);

          // Dynamically calculate zoom level based on bounds size
          const latDiff = bounds.maxLat - bounds.minLat;
          const lngDiff = bounds.maxLng - bounds.minLng;
          const maxDiff = Math.max(latDiff, lngDiff);

          // Calculate zoom based on the size of the bounding box
          // Smaller value = more zoomed out, larger value = more zoomed in
          let newZoom = 10; // Default zoom

          if (maxDiff > 5) newZoom = 5;
          else if (maxDiff > 2) newZoom = 6;
          else if (maxDiff > 1) newZoom = 7;
          else if (maxDiff > 0.5) newZoom = 8;
          else if (maxDiff > 0.1) newZoom = 9;
          else if (maxDiff > 0.05) newZoom = 10;
          else if (maxDiff > 0.01) newZoom = 11;
          else newZoom = 12;

          setZoom(newZoom);
        }
      }
    }
  }, [filteredListings, singlePropertyMode, initialLatitude, initialLongitude, selectedProperty, fullScreenMode, maintainMapPosition]);

  // Auto-select the property in single property mode
  useEffect(() => {
    if (singlePropertyMode && filteredListings.length === 1 && filteredListings[0]?.id) {
      setInternalSelectedProperty(filteredListings[0].id);

      // Show property popup only if we're in fullScreenMode
      // This ensures we don't automatically show the popup on the listings page
      if (onPropertyPopupToggle && fullScreenMode) {
        onPropertyPopupToggle(true);
      }
    }
  }, [singlePropertyMode, filteredListings, setInternalSelectedProperty, latitude, longitude, onPropertyPopupToggle, fullScreenMode]);

  // Improved React map instance handling
  const onMapLoad = useCallback((event: any) => {
    setIsMapLoaded(true);
    if (event && event.target) {
      setMapInstance(event.target as any);
    }
  }, []);

  // Handle map clicks
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    // Do not clear selection on general map clicks when in fullScreenMode
    if (fullScreenMode && selectedStation !== null) {
      e.preventDefault();
      return;
    }
  }, [selectedStation, fullScreenMode]);

  // Handle marker click with optional callback for mobile
  const handleMarkerClick = (listing: Listing) => {
    // Check if property is already selected
    const isAlreadySelected = selectedProperty === listing.id;

    // Always mark listing as viewed when clicked regardless of other actions
    if (listing.id) {
      markListingAsViewed(listing.id);
    }

    // Check if we're on the listings page
    const isListingsPage = currentRoute === '/listings';

    // Use the passed isMobileView prop directly (already set in parent component)
    const isDesktopView = !isMobileView;

    console.log('[DEBUG] Marker clicked:', {
      isListingsPage,
      isDesktopView,
      isMobileView,
      listingId: listing.id,
      currentRoute,
      isAlreadySelected,
      showPropertyPopup: effectiveShowPropertyPopup
    });

    // Set the internal selected property regardless of view mode
    // This ensures the property is marked as selected in the map
    setInternalSelectedProperty(listing.id || null);

    // For desktop view on listings page, explicitly show the popup
    // and call onPinSelect to trigger the desktop handler
    if (isDesktopView) {
      console.log('[DEBUG] Desktop marker click on listings page');

      console.log(onPropertyPopupToggle)
      // Reset internal popup visibility if we're managing it ourselves
      if (!onPropertyPopupToggle) {
        setInternalPopupVisible(true);
      }

      // Show property popup if toggle function is available
      if (onPropertyPopupToggle) {
        onPropertyPopupToggle(true);
      }

      // Call onPinSelect to trigger the property detail drawer
      if (onPinSelect) {
        onPinSelect(listing);
      }

      return;
    }

    // Mobile view on listings page - only call onPinSelect for drawer
    if (isListingsPage && isMobileView) {
      console.log('[DEBUG] Mobile marker click on listings page');
      if (onPinSelect) {
        onPinSelect(listing);
      }
      return;
    }

    // For all other pages (non-listings pages), always ensure the popup is visible when marker is clicked
    // This fixes the issue where popup doesn't reappear after closing
    console.log('[DEBUG-POPUP] Non-listings page marker click - ensuring popup is visible');
    if (onPropertyPopupToggle) {
      onPropertyPopupToggle(true);
    } else {
      setInternalPopupVisible(true);
    }

    // Update internal selection state if needed
    if (selectedPropertyId === undefined) {
      setInternalSelectedProperty(listing.id || null);
    }

    // If onPinSelect callback is provided, call it
    // This typically opens the property detail drawer in the parent component
    if (onPinSelect) {
      onPinSelect(listing);
    }
  };

  // Determine if we have listings with coordinates
  const hasCoordinates = filteredListings.some(
    listing => listing.coordinates?.lat && listing.coordinates?.long
  );

  // Check if we're on the listings page
  const isListingsPage = currentRoute === '/listings';

  // Adjust zoom level based on mode and directly center on property in fullscreen
  useEffect(() => {
    // Skip auto-positioning if we have explicit initial coordinates
    if (initialLatitude !== undefined && initialLongitude !== undefined) {
      return;
    }

    // Skip auto-positioning if maintainMapPosition is true
    if (maintainMapPosition) {
      return;
    }

    // Only proceed with repositioning if in fullScreenMode - this prevents the map from
    // moving when selecting a property from the listings page
    if (!fullScreenMode) {
      return;
    }

    if (fullScreenMode && filteredListings.length === 1 && filteredListings[0]?.coordinates) {
      const propertyCoordinates = filteredListings[0].coordinates;

      if (typeof propertyCoordinates.lat === 'number' &&
        typeof propertyCoordinates.long === 'number') {

        // Define Tokyo coordinates
        const tokyoLat = 35.6812; // Tokyo station
        const tokyoLng = 139.7671;

        // Compute the midpoint between Tokyo and the property
        const midpointLat = (tokyoLat + propertyCoordinates.lat) / 2;
        const midpointLng = (tokyoLng + propertyCoordinates.long) / 2;

        // Calculate distance in degrees to determine appropriate zoom
        const latDistance = Math.abs(tokyoLat - propertyCoordinates.lat);
        const lngDistance = Math.abs(tokyoLng - propertyCoordinates.long);
        const maxDistance = Math.max(latDistance, lngDistance);

        // Set zoom level based on distance - larger distances need more zoomed out view
        let zoomLevel;
        if (maxDistance > 2) zoomLevel = 6; // Very far - more zoomed out
        else if (maxDistance > 1) zoomLevel = 7;
        else if (maxDistance > 0.5) zoomLevel = 7.5;
        else zoomLevel = 8; // Closer - can be more zoomed in

        // Use provided customZoom if available, otherwise use our calculated zoom
        setZoom(customZoom || zoomLevel);

        // Center the map at the midpoint between Tokyo and the property
        setLatitude(midpointLat);
        setLongitude(midpointLng);
      }
    }
  }, [fullScreenMode, filteredListings, customZoom, initialLatitude, initialLongitude, maintainMapPosition]);

  // Use useEffect to add a manual double-tap handling on touch devices
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let touchStartTime = 0;
    let touchPosition = { x: 0, y: 0 };
    let lastTouchEndTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartTime = Date.now();
        touchPosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        const now = Date.now();
        const elapsed = now - touchStartTime;
        const timeSinceLastTouch = now - lastTouchEndTime;

        // Double tap detection (quick touch under 300ms, and second touch within 300ms of first)
        if (elapsed < 300 && timeSinceLastTouch < 300) {
          console.log('[DEBUG-ZOOM] Double-tap detected on map container');
          isDoubleTapZooming.current = true;

          // Calculate new zoom level (typically +1 from current zoom)
          const newZoom = zoom + 1;

          // Use setTimeout to ensure the zoom update happens
          setTimeout(() => {
            // Update internal zoom immediately
            setZoom(newZoom);

            // Notify parent of zoom change through onMove
            if (onMove) {
              // Create a synthetic zoom event
              const syntheticEvent = {
                viewState: {
                  latitude,
                  longitude,
                  zoom: newZoom,
                  bearing: 0,
                  pitch: 0,
                  padding: { left: 0, top: 0, right: 0, bottom: 0 }
                },
                originalEvent: { type: 'double-tap-zoom' },
                type: 'moveend'
              };
              onMove(syntheticEvent as any);
            }

            // Reset the flag after processing is done
            setTimeout(() => {
              isDoubleTapZooming.current = false;
              console.log('[DEBUG-ZOOM] Double-tap zoom processing completed');
            }, 500);
          }, 50);
        }

        lastTouchEndTime = now;
      }
    };

    // Add the listeners
    const element = mapContainerRef.current;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Clean up
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoom, latitude, longitude, onMove]);

  const pathname = usePathname();
  const router = useRouter();

  if (!hasCoordinates) {
    return (
      <div className="h-full bg-gray-100 flex items-center justify-center flex-col gap-2">
        <p className="text-gray-500">No properties with coordinates match your filters</p>
        <p className="text-xs text-gray-400">Try adjusting your filters to see more properties</p>
      </div>
    );
  }

  // Show error if no Mapbox token is provided
  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full bg-gray-100 flex items-center justify-center flex-col gap-2">
        <p className="text-gray-500">Mapbox token is missing. Please add it to your environment variables.</p>
      </div>
    );
  }

  return (
    <div
      className="h-full relative"
      ref={mapContainerRef}
      onTouchStart={handleMapTouchStart}
    >
      {/* Add some global styles for the popups */}
      <style jsx global>{`
        .mapboxgl-popup-content {
          border-radius: 8px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
        }
        /* Make sure only the popup content captures pointer events */
        .mapboxgl-popup-tip {
          pointer-events: none !important;
        }
      `}</style>

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!singlePropertyMode && (
        <div className="absolute top-2 right-2 z-10 bg-white rounded shadow-md px-3 py-1 text-xs font-medium text-gray-500">
          {filteredListings.length} properties shown
        </div>
      )}

      {/* Only show Shinkansen info when not on listings page */}
      {singlePropertyMode && fullScreenMode && !isListingsPage && (
        <div className="absolute bottom-5 left-3 z-10 bg-white/90 rounded shadow-md p-3 text-xs max-w-[280px]">
          <div className="font-medium text-sm mb-2">Jōetsu Shinkansen Line</div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-6 h-1 bg-red-500 rounded-full"></div>
            <span className="font-medium flex items-center">
              <Train className="h-3 w-3 mr-1" /> Tokyo → Niigata route
            </span>
          </div>

          <div className="text-gray-600 text-[10px] leading-tight mb-2">
            The Jōetsu Shinkansen connects Tokyo with Niigata, providing high-speed rail service through mountainous terrain.
          </div>

          <div className="flex items-center gap-1.5 mt-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
            <span className="text-[10px] italic text-gray-500">
              Click on station markers to see station names
            </span>
          </div>

          <div className="text-[10px] text-gray-600 mt-1 italic">
            Map shows both Tokyo and property location for regional context
          </div>
        </div>
      )}

      {/* Only show Shinkansen info when not on listings page */}
      {singlePropertyMode && !fullScreenMode && !isListingsPage && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/90 rounded shadow-md p-2 text-xs max-w-[200px]">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-1 bg-red-500 rounded-full"></div>
            <span className="font-medium flex items-center">
              <Train className="h-3 w-3 mr-1" /> Jōetsu Shinkansen
            </span>
          </div>
          <p className="text-gray-600 text-[10px] leading-tight">Tokyo → Niigata route</p>
          {isMobileView && (
            <div className="flex items-center mt-1.5 gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
              <p className="text-[9px] text-gray-500 italic">Tap stations for info</p>
            </div>
          )}
        </div>
      )}

      <ReactMapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        latitude={latitude}
        longitude={longitude}
        zoom={zoom}
        onMove={handleMapMove}
        onClick={handleMapClick}
        onLoad={onMapLoad}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Shinkansen Route Line Segments - only shown in single property mode and not on listings page */}
        {singlePropertyMode && !isListingsPage && shinkansenRoutePoints.map((point, index) => (
          <Marker
            key={`route-point-${index}`}
            longitude={point[0]}
            latitude={point[1]}
          >
            <div className="w-1 h-1 rounded-full bg-red-500 opacity-80" style={{ zIndex: 0 }} />
          </Marker>
        ))}

        {/* Shinkansen Station Markers - only shown when not on listings page */}
        {singlePropertyMode && !isListingsPage && shinkansenStations.map((station, index) => (
          <Marker
            key={`station-${index}`}
            longitude={station.coordinates[0]}
            latitude={station.coordinates[1]}
            anchor="center"
            onClick={(e: any) => {
              // Set the station selection flag
              isStationSelectionInProgress.current = true;

              console.log('[DEBUG-ZOOM] Station marker clicked:', {
                station: station.name,
                index,
                currentZoom: zoom
              });

              // Don't do anything if the station is already selected
              if (selectedStation === index) {
                console.log('[DEBUG-ZOOM] Station already selected, not making changes');
                isStationSelectionInProgress.current = false;
                return;
              }

              // Update internal state
              setInternalSelectedStation(index);

              // Call external callback if provided
              if (onStationSelect) {
                onStationSelect(index);
              }

              // Use setTimeout to reset the flag after the event cycle completes
              setTimeout(() => {
                isStationSelectionInProgress.current = false;
                console.log('[DEBUG-ZOOM] Station selection completed, flag reset');
              }, 300);

              // Prevent event propagation if possible
              if (e && typeof e.preventDefault === 'function') {
                e.preventDefault();
              }
              if (e && e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
                e.originalEvent.stopPropagation();
              }
            }}
            style={{ cursor: 'pointer' }}
            className={`station-marker ${selectedStation === index ? 'selected-station' : ''}`}
          >
            <div
              className={`
                w-4 h-4 md:w-6 md:h-6 
                rounded-full 
                bg-red-500 
                border-2 
                ${selectedStation === index ? 'border-yellow-400 shadow-md scale-125' : 'border-white'} 
                hover:scale-125 
                transition-transform 
                touch-manipulation
                z-10
                ${selectedStation === index ? '!z-20' : ''}
              `}
              aria-label={`Station: ${station.name}`}
              title={station.name}
              onClick={(e) => {
                // Handle the div click with proper event handling
                if (e) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            />
          </Marker>
        ))}

        {/* Station name popup when selected - only shown when not on listings page */}
        {selectedStation !== null && singlePropertyMode && !isListingsPage && (() => {
          // Get coordinates of the station
          const stationCoords = shinkansenStations[selectedStation].coordinates;
          
          // Check if there's a property popup that might overlap
          const hasPropertyPopup = selectedProperty && showPropertyPopup;
          let propertyCoords = { lat: 0, lng: 0 };
          
          if (hasPropertyPopup && filteredListings.length > 0) {
            const listing = filteredListings.find(l => l.id === selectedProperty);
            if (listing?.coordinates?.lat && listing?.coordinates?.long) {
              propertyCoords = {
                lat: listing.coordinates.lat,
                lng: listing.coordinates.long
              };
            }
          }
          
          // Use the determinePopupAnchor function to get the optimal anchor
          const chosenAnchor = determinePopupAnchor(
            { lat: stationCoords[1], lng: stationCoords[0] }, // Station coordinates
            { lat: latitude, lng: longitude }, // Viewport center
            zoom,
            isMobileView,
            hasPropertyPopup ? { 
              coords: propertyCoords, 
              type: 'property' 
            } : null,
            singlePropertyMode
          );
          
          console.log(`[DEBUG-POPUP] Station ${shinkansenStations[selectedStation].name} popup anchor: ${chosenAnchor}`);
          
          return (
            <Popup
              longitude={stationCoords[0]}
              latitude={stationCoords[1]}
              closeOnClick={false}
              closeButton={true}
              onClose={() => {
                // Set the flag when closing station popup
                isStationSelectionInProgress.current = true;

                console.log('[DEBUG-ZOOM] Station popup closed, currentZoom:', zoom);
                setInternalSelectedStation(null);

                // Call external callback if provided
                if (onStationSelect) {
                  onStationSelect(null);
                }

                // Reset the flag after the event cycle
                setTimeout(() => {
                  isStationSelectionInProgress.current = false;
                  console.log('[DEBUG-ZOOM] Station selection flag reset after popup close');
                }, 300);
              }}
              anchor={chosenAnchor}
              className="station-popup z-50 !z-[9999]"
            >
              <AnchorStyle anchor={chosenAnchor} />
              <div className={`p-2 text-sm ${isMobileView ? 'min-w-[150px]' : ''}`}>
                <div className="font-medium flex items-center">
                  <Train className="h-3 w-3 text-red-500 mr-1.5" />
                  {shinkansenStations[selectedStation].name}
                </div>
                <div className="text-xs text-gray-600">Jōetsu Shinkansen Station</div>
                {isMobileView && (
                  <div className="mt-1 text-[10px] text-gray-500">
                    Part of the high-speed rail network connecting Tokyo to Niigata
                  </div>
                )}
              </div>
            </Popup>
          );
        })()}

        {filteredListings.map((listing) => {
          if (
            listing.coordinates?.lat &&
            listing.coordinates?.long
          ) {
            const isSelected = selectedProperty === listing.id;
            const isSold = listing.isSold || listing.isDetailSoldPresent;
            const priceJPY = parseJapanesePrice(listing.price);
            const priceUSD = convertCurrency(priceJPY, "JPY", "USD");

            return (
              <Marker
                key={listing.id}
                latitude={listing.coordinates.lat}
                longitude={listing.coordinates.long}
                onClick={() => handleMarkerClick(listing)}
              >
                {useSimpleMarker ? (
                  // Simple marker design
                  <div className={`
                    cursor-pointer transition-all duration-200
                    ${isSelected ? 'scale-125 z-10' : 'scale-100 hover:scale-110'} 
                    ${isMobileView ? 'touch-manipulation' : ''}
                  `}>
                    <div className="w-6 h-6 rounded-full bg-green-600 border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                ) : (
                  // Original price bubble marker
                  <div className={`
                    cursor-pointer transition-all duration-200
                    ${isSelected ? 'scale-125 z-10' : 'scale-100 hover:scale-110'} 
                    ${isMobileView ? 'touch-manipulation' : ''}
                  `}>
                    <div className={`
                      relative px-2 py-1 rounded-md shadow-lg text-sm font-medium
                      ${isSelected
                        ? 'bg-green-600 text-white'
                        : hasViewedListing(listing.id)
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' // Viewed properties
                          : 'bg-green-50 text-green-800 border border-green-200'} // Unviewed properties
                      ${isSold ? 'border-2 border-red-500' : ''}
                    `}>
                      <span className="whitespace-nowrap">
                        {(() => {
                          // Get the raw price in JPY
                          const priceJPY = parseJapanesePrice(listing.price);
                          
                          // Get the selected currency from filterState
                          const currency = filterState.priceRange.currency || "USD";
                          
                          // Convert price to the selected currency
                          const convertedPrice = currency === "JPY"
                            ? priceJPY
                            : convertCurrency(priceJPY, "JPY", currency);
                          
                          // Format price based on currency
                          switch (currency) {
                            case "USD":
                              return `$${Math.round(convertedPrice).toLocaleString()}`;
                            case "EUR":
                              return `€${Math.round(convertedPrice).toLocaleString()}`;
                            case "AUD":
                              return `A$${Math.round(convertedPrice).toLocaleString()}`;
                            case "JPY":
                              return `¥${(convertedPrice / 1_000_000).toFixed(1)}M`;
                            default:
                              return `¥${Math.round(priceJPY).toLocaleString()}`;
                          }
                        })()}
                      </span>
                      
                      {/* Show original price in smaller text if it's converted */}
                      {/* {filterState.priceRange.currency !== "JPY" && (
                        <span className="text-xs text-gray-400 ml-1">
                          (¥{Math.round(parseJapanesePrice(listing.price)).toLocaleString()})
                        </span>
                      )} */}

                      {/* Triangle pointer at bottom of price bubble */}
                      <div className={`
                        absolute -bottom-2 left-1/2 transform -translate-x-1/2
                        w-0 h-0 border-l-[8px] border-l-transparent
                        border-r-[8px] border-r-transparent
                        ${isSelected
                          ? 'border-t-[8px] border-t-green-600'
                          : hasViewedListing(listing.id)
                            ? 'border-t-[8px] border-t-blue-100' // Match viewed color
                            : 'border-t-[8px] border-t-green-50'} // Match unviewed color
                      `}></div>
                    </div>
                  </div>
                )}
              </Marker>
            );
          }
          return null;
        })}

        {/* Property Popup */}
        {selectedProperty && effectiveShowPropertyPopup && !hidePopup && (
          // For both listings page and non-listings pages, always show popup in desktop mode
          // Only hide on mobile for listings page
          isListingsPage ? !isMobileView : true
        ) && (() => {
          const listing = filteredListings.find(l => l.id === selectedProperty);
          if (!listing || !listing.coordinates?.lat || !listing.coordinates?.long) return null;
          
          // Check if there's a station popup that might overlap
          const hasStationPopup = selectedStation !== null;
          let stationPosition = { lat: 0, lng: 0 };
          
          if (hasStationPopup) {
            stationPosition = {
              lat: shinkansenStations[selectedStation].coordinates[1],
              lng: shinkansenStations[selectedStation].coordinates[0]
            };
          }
          
          // Use the determinePopupAnchor function to get the optimal anchor
          const chosenAnchor = determinePopupAnchor(
            { 
              lat: listing.coordinates.lat, 
              lng: listing.coordinates.long 
            },
            { lat: latitude, lng: longitude },
            zoom,
            isMobileView,
            hasStationPopup ? { 
              coords: stationPosition, 
              type: 'station'
            } : null,
            singlePropertyMode
          );
          
          console.log(`[DEBUG-POPUP] Property popup anchor: ${chosenAnchor}`);
          
          // In single property mode, show detailed popup automatically
          return (
            <Popup
              latitude={listing.coordinates.lat}
              longitude={listing.coordinates.long}
              closeOnClick={false}
              onClose={() => {
                // In fullScreenMode, we don't want to allow closing the popup
                if (fullScreenMode) {
                  console.log('[DEBUG-POPUP] Ignoring popup close in fullScreenMode');
                  // Do nothing to prevent closing
                  return;
                }
                
                const isListingsPage = currentRoute === '/listings';
                const isDesktopView = !isMobileView;
                
                if (singlePropertyMode && onPropertyPopupToggle) {
                  // In single property mode, inform parent that popup should be closed
                  onPropertyPopupToggle(false);
                } else if (!singlePropertyMode) {
                  
                  // For ALL desktop views (both listings and non-listings pages), 
                  // just hide the popup but maintain property selection
                  // For mobile views on non-listings pages, clear the selected property
                  setInternalSelectedProperty(null);
                }
              }}
              className="map-popup property-info-popup"
              closeButton={!fullScreenMode} // Remove close button in fullScreenMode
              anchor={chosenAnchor}
            >
              <AnchorStyle anchor={chosenAnchor} />
              <div
                className={`pt-2.5 ${isMobileView ? 'min-w-[220px] max-w-[280px]' : ''} cursor-pointer`}
                style={{
                  marginBottom: isMobileView ? '' : '0',  // Reduced space below popup content to adjust y-position
                }}
                onClick={pathname === '/listings' ? () => {
                  // Handle click on popup content for navigation
                  if (listing.id) {
                    router.push(`/listings/view/${listing.id}`);
                  }
                } : undefined}
              >
                {/* Preview Image */}
                {listing.listingImages && listing.listingImages.length > 0 && (
                  <div className="mb-2 overflow-hidden rounded-md">
                    <img
                      src={listing.listingImages[0]}
                      alt={listing.address || "Property"}
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                {/* Address in subheader font - made more prominent since we removed the title */}
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{listing.address || 'Property'}</h3>

                {/* Property Details */}
                <div className="space-y-1.5">
                  {/* Layout */}
                  {listing.layout && (
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 mr-2 min-w-[65px]">Layout:</span>
                      <span className="font-medium">{listing.layout}</span>
                    </div>
                  )}

                  {/* Build Area */}
                  {listing.buildSqMeters && (
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 mr-2 min-w-[65px]">Build Area:</span>
                      <span className="font-medium">{listing.buildSqMeters} m²</span>
                    </div>
                  )}

                  {/* Land Area */}
                  {listing.landSqMeters && (
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 mr-2 min-w-[65px]">Land Area:</span>
                      <span className="font-medium">{listing.landSqMeters} m²</span>
                    </div>
                  )}

                </div>

                {/* Sold Status - keep this */}
                {(listing.isSold || listing.isDetailSoldPresent) && (
                  <p className="text-xs text-red-500 font-medium mt-2">SOLD</p>
                )}

                {/* View Details Link */}
                {
                  pathname === '/listings' && (
                    <div className="mt-3 text-xs text-blue-600 font-medium hover:underline">
                      Click to view property details
                    </div>
                  )
                }
              </div>
            </Popup>
          );
        })()}
      </ReactMapGL>
    </div>
  );
}

// Create the MapPlaceholder component to wrap the MapDisplay component
// This allows us to use MapPlaceholder in the listings page
export function MapPlaceholder(props: MapDisplayProps) {
  return <MapDisplay {...props} />;
}