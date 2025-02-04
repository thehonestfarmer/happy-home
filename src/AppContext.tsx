"use client";
import { createContext, ReactNode, useContext } from "react";
import { useImmer } from "use-immer";
import { Currency } from "@/lib/listing-utils";

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export type FilterState = {
  showSold: boolean;
  listingType: 'for-sale' | 'sold';
  priceRange: {
    min: number | null;
    max: number | null;
    currency: Currency;
  };
  layout: {
    minLDK: number | null;
  };
  size: {
    minBuildSize: number | null;
    maxBuildSize: number | null;
    minLandSize: number | null;
    maxLandSize: number | null;
  };
};

export const defaultFilterState: FilterState = {
  showSold: false,
  listingType: 'for-sale',
  priceRange: {
    min: null,
    max: null,
    currency: "USD"
  },
  layout: {
    minLDK: null,
  },
  size: {
    minBuildSize: null,
    maxBuildSize: null,
    minLandSize: null,
    maxLandSize: null,
  },
};

export type DisplayState = {
  lightboxListingIdx: number[] | null;
  drawerOpen: boolean;
};

export type AppContextValue = {
  displayState: DisplayState;
  filterState: FilterState;
  setDisplayState: (draft: DisplayState) => void;
  setFilterState: (draft: FilterState) => void;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [displayState, setDisplayState] = useImmer<DisplayState>({
    lightboxListingIdx: null,
    drawerOpen: false,
  });

  const [filterState, setFilterState] = useImmer<FilterState>(defaultFilterState);

  const value = {
    displayState,
    filterState,
    setDisplayState,
    setFilterState: setFilterState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("AppContext must be used within an AppProvider");
  }

  return context;
};
