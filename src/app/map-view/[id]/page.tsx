"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, X, Info } from "lucide-react";
import { MapDisplay } from "@/components/map/MapPlaceholder";
import { useListings } from "@/contexts/ListingsContext";

export default function FullScreenMapView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { listingsById, isLoading } = useListings();
  const [property, setProperty] = useState<any>(null);
  const [currentZoom, setCurrentZoom] = useState(7); // Initial zoom level
  // Add state to track map position
  const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  // Track if we're in the middle of a station selection
  const stationSelectionInProgress = useRef(false);
  // Track the last zoom level before station selection
  const lastZoomBeforeSelection = useRef(7);
  // Track if a gesture zoom is in progress (e.g., double-tap, pinch)
  const isGestureZoomInProgress = useRef(false);
  // Track position before station selection to prevent position reset
  const lastKnownPosition = useRef<{ lat: number | null, lng: number | null }>({ lat: null, lng: null });
  // Track initial position to detect panning
  const initialPosition = useRef<{ lat: number | null, lng: number | null }>({ lat: null, lng: null });
  // Flag to track if the user has interacted with the map
  const hasUserPannedMap = useRef(false);
  // Ref for position preservation before/after state changes
  const positionBeforeStateChange = useRef<{ lat: number | null, lng: number | null }>({ lat: null, lng: null });

  // Handlers for zoom controls
  const handleZoomIn = () => {
    setCurrentZoom((prevZoom) => Math.min(prevZoom + 1, 18));
  };

  const handleZoomOut = () => {
    setCurrentZoom((prevZoom) => Math.max(prevZoom - 1, 5));
  };

  // Update zoom and position state when map moves
  const handleMapMove = (evt: any) => {
    // Track the event source for debugging
    const eventSource = evt.originalEvent ?
      evt.originalEvent.type || 'unknown' :
      'no-original-event';

    // Get new position from event
    const newLatitude = evt.viewState.latitude;
    const newLongitude = evt.viewState.longitude;

    // Special handling for synthetic double-tap events
    const isDoubleTapEvent = eventSource === 'double-tap-zoom';
    const hasZoomChanged = Math.abs(evt.viewState.zoom - currentZoom) > 0.1;

    // Record initial position on first move
    if (initialPosition.current.lat === null) {
      initialPosition.current = { lat: newLatitude, lng: newLongitude };
    }

    // Always save the latest position to our ref
    lastKnownPosition.current = {
      lat: newLatitude,
      lng: newLongitude
    };

    // Detect if user has panned the map (even without zooming)
    // This compares with initial position and current position
    if (!hasUserPannedMap.current && initialPosition.current.lat !== null) {
      const latDiff = Math.abs(newLatitude - (initialPosition.current.lat || 0));
      const lngDiff = Math.abs(newLongitude - (initialPosition.current.lng || 0));

      // If position changed significantly from initial position
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        hasUserPannedMap.current = true;
      }
    }

    // Extra position tracking to detect pans from current position
    if (!stationSelectionInProgress.current && currentLatitude !== null) {
      const latDiff = Math.abs(newLatitude - (currentLatitude || 0));
      const lngDiff = Math.abs(newLongitude - (currentLongitude || 0));

      // If position changed significantly from current state
      if (latDiff > 0.0001 || lngDiff > 0.0001) {

        if (!hasZoomChanged) {
          // If position changed without zoom change, it's a pan
          hasUserPannedMap.current = true;
        }
      }
    }

    // Always update position when map moves
    setCurrentLatitude(newLatitude);
    setCurrentLongitude(newLongitude);

    // Skip zoom updates during station selection
    if (stationSelectionInProgress.current) {
      return;
    }

    // Always update zoom for double-tap events
    if (isDoubleTapEvent) {
      setCurrentZoom(evt.viewState.zoom);
      return;
    }

    // Update zoom for all other significant changes
    if (hasZoomChanged) {
      setCurrentZoom(evt.viewState.zoom);
    }
  };

  // Handle station selection with position preservation
  const handleStationSelect = (stationIndex: number | null) => {
    // Save position before station selection
    positionBeforeStateChange.current = {
      lat: currentLatitude,
      lng: currentLongitude
    };

    // Set the flag to ignore zoom updates during station selection
    stationSelectionInProgress.current = true;

    // Store if user has panned the map before changing state
    const userHasPannedBefore = hasUserPannedMap.current;

    console.log('[PAN-DEBUG] Before station select:', {
      position: positionBeforeStateChange.current,
      hasUserPanned: hasUserPannedMap.current
    });

    // Update station selection state
    setSelectedStation(stationIndex);

    // Reset the flag after the update has processed
    setTimeout(() => {
      stationSelectionInProgress.current = false;

      // Always treat position changes as user pans after station selection
      // This ensures position is preserved even if user hasn't explicitly zoomed
      hasUserPannedMap.current = true;

      // Always restore position after station selection if position was set before
      if (positionBeforeStateChange.current.lat !== null) {

        // Force position update to ensure it's applied
        setCurrentLatitude(positionBeforeStateChange.current.lat);
        setCurrentLongitude(positionBeforeStateChange.current.lng);
      }
    }, 100);
  };

  useEffect(() => {
    if (!isLoading && params.id && listingsById[params.id]) {
      setProperty(listingsById[params.id]);

      // Reset position tracking when loading a new property
      initialPosition.current = { lat: null, lng: null };
      lastKnownPosition.current = { lat: null, lng: null };
      positionBeforeStateChange.current = { lat: null, lng: null };
      hasUserPannedMap.current = false;
    }
  }, [isLoading, listingsById, params.id]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!property || property.removed) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Property not found or has been removed</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* Floating buttons container */}
      <div className="absolute top-4 left-4 z-50 flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-9 w-9 p-0 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center bg-black/20 hover:bg-black/30"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Property name as a floating header */}
      <div className="absolute top-4 left-16 right-4 z-40">
        <div className="bg-black/20 backdrop-blur-sm rounded-md px-4 py-2 text-white">
          <h1 className="text-lg font-semibold truncate">
            {property.propertyTitle || property.address || "Property Location"}
          </h1>
        </div>
      </div>

      {/* Zoom controls - fixed on the right side */}
      {property.coordinates?.lat && property.coordinates?.long && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
          <Button
            onClick={handleZoomIn}
            className="h-12 w-12 rounded-full shadow-lg bg-white/80 hover:bg-white border border-gray-200 text-gray-700 backdrop-blur-sm"
            variant="outline"
            size="icon"
            aria-label="Zoom In"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
            <span className="sr-only">Zoom In</span>
          </Button>

          <Button
            onClick={handleZoomOut}
            className="h-12 w-12 rounded-full shadow-lg bg-white/80 hover:bg-white border border-gray-200 text-gray-700 backdrop-blur-sm"
            variant="outline"
            size="icon"
            aria-label="Zoom Out"
          >
            <Minus className="h-6 w-6" strokeWidth={2.5} />
            <span className="sr-only">Zoom Out</span>
          </Button>
        </div>
      )}

      {/* Full-screen map */}
      {property.coordinates?.lat && property.coordinates?.long ? (
        <div className="h-full w-full absolute top-0 left-0">
          <MapDisplay
            listings={[property]}
            singlePropertyMode={true}
            fullScreenMode={true}
            customZoom={currentZoom}
            isMobileView={true}
            onMove={handleMapMove}
            selectedStation={selectedStation}
            onStationSelect={handleStationSelect}
            showPropertyPopup={false}
            initialLatitude={currentLatitude !== null ? currentLatitude : undefined}
            initialLongitude={currentLongitude !== null ? currentLongitude : undefined}
          />
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted/10">
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <p className="mb-4">Location coordinates are not available for this property.</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 