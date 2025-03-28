"use client";

import { useState, useCallback } from "react";
import { MapDisplay } from "./MapPlaceholder";
import type { MapDisplayProps } from "./MapPlaceholder";
import { Button } from "@/components/ui/button";
import type { ViewStateChangeEvent } from "react-map-gl/mapbox";

// This is a dedicated component for the listings page map
// It wraps MapDisplay but ensures fullScreenMode is NEVER true
export function ListingsMapView(props: Omit<MapDisplayProps, 'fullScreenMode'>) {
  // Default zoom level - initialize to undefined to let MapDisplay use its default zoom
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  
  // Handler for map movement events
  const handleMapMove = useCallback((evt: ViewStateChangeEvent) => {
    // Update our local zoom state when the map is moved
    setZoom(evt.viewState.zoom);
    
    // Forward the event to any existing onMove handler
    if (props.onMove) {
      props.onMove(evt);
    }
  }, [props.onMove]);

  // Function to handle increasing zoom
  const handleZoomIn = () => {
    setZoom(prev => {
      const currentZoom = prev ?? 10;
      return Math.min(currentZoom + 1, 19); // Max zoom is 19
    });
  };

  // Function to handle decreasing zoom
  const handleZoomOut = () => {
    setZoom(prev => {
      const currentZoom = prev ?? 10;
      return Math.max(currentZoom - 1, 5); // Min zoom is 5
    });
  };

  return (
    <div className="relative h-full">
      <MapDisplay 
        {...props} 
        fullScreenMode={false} // Always force fullScreenMode to false
        currentRoute="/listings" // Always set the current route to /listings
        onMove={handleMapMove}
        customZoom={zoom}
      />
      
      {/* Zoom controls overlay */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-8 w-8 p-0 rounded-full shadow-md bg-white hover:bg-gray-100 flex items-center justify-center"
          onClick={handleZoomIn}
          aria-label="Zoom in"
        >
          <span className="text-md font-bold text-gray-700">+</span>
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-8 w-8 p-0 rounded-full shadow-md bg-white hover:bg-gray-100 flex items-center justify-center"
          onClick={handleZoomOut}
          aria-label="Zoom out"
        >
          <span className="text-md font-bold text-gray-700">−</span>
        </Button>
      </div>
    </div>
  );
} 