"use client";

import { MapDisplay } from "./MapPlaceholder";
import type { MapDisplayProps } from "./MapPlaceholder";

// This is a dedicated component for the listings page map
// It wraps MapDisplay but ensures fullScreenMode is NEVER true
export function ListingsMapView(props: Omit<MapDisplayProps, 'fullScreenMode'>) {
  return (
    <MapDisplay 
      {...props} 
      fullScreenMode={false} // Always force fullScreenMode to false
      currentRoute="/listings" // Always set the current route to /listings
    />
  );
} 