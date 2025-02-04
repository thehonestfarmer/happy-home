"use client";
import { createContext, ReactNode, useContext } from "react";
import { useImmer } from "use-immer";
import { Currency } from "@/lib/listing-utils";

interface PriceFilterState {
  selectedCurrency: Currency;
  selectedRangeIndex: number | null;
  localRange: [number, number];
}

interface AppContextType {
  displayState: DisplayState;
  filterState: FilterState;
  priceFilterState: PriceFilterState;
  setDisplayState: (draft: DisplayState) => void;
  setFilterState: (draft: FilterState) => void;
  setPriceFilterState: (updater: (draft: PriceFilterState) => void) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [displayState, setDisplayState] = useImmer<DisplayState>({
    lightboxListingIdx: null,
    drawerOpen: false,
  });

  const [filterState, setFilterState] = useImmer<FilterState>(defaultFilterState);

  const [priceFilterState, setPriceFilterState] = useImmer<PriceFilterState>({
    selectedCurrency: "JPY",
    selectedRangeIndex: null,
    localRange: [0, 100_000_000],
  });

  const value = {
    displayState,
    filterState,
    priceFilterState,
    setDisplayState,
    setFilterState,
    setPriceFilterState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("AppContext must be used within an AppProvider");
  }

  return context;
};
