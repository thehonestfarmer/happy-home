"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useLoadListings } from "@/hooks";

interface Listing {
  id: string;
  addresses: string;
  prices: string;
  listingImages: string[];
  // ... add other listing properties as needed
}

// Define the context type
interface ListingsContextType {
  listings: Listing[];
  listingsById: Record<string, Listing>;
  isLoading: boolean;
  error: Error | null;
}

// Create the context
const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

// Create the provider component
export function ListingsProvider({ children }: { children: ReactNode }) {
  const { listings, isLoading, error } = useLoadListings();

  // Create a memoized map of listings by ID
  const listingsById = useMemo(() => {
    if (!listings) return {};
    return listings.reduce<Record<string, Listing>>((acc, listing) => {
      acc[listing.id] = listing;
      return acc;
    }, {});
  }, [listings]);

  return (
    <ListingsContext.Provider value={{ listings, listingsById, isLoading, error }}>
      {children}
    </ListingsContext.Provider>
  );
}

// Create a custom hook to use the listings context
export function useListings() {
  const context = useContext(ListingsContext);
  if (context === undefined) {
    throw new Error("useListings must be used within a ListingsProvider");
  }
  return context;
} 