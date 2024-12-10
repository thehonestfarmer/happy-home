"use client";
import { createContext, ReactNode, useContext } from "react";
import { useImmer } from "use-immer";

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export type FilterState = {
  minLDK: number;
  minLivingSize: number;
  minPropertySize: number;
  maxPrice: number;
  location: string;
};

export type DisplayState = {
  lightboxListingIdx: number[] | null;
  drawerOpen: boolean;
};

export type AppContextValue = {
  displayState: DisplayState;
  listingState: FilterState;
  setDisplayState: (draft: DisplayState) => void;
  setListingState: (draft: FilterState) => void;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [displayState, setDisplayState] = useImmer<DisplayState>({
    lightboxListingIdx: null,
    drawerOpen: false,
  });

  const [listingState, setListingState] = useImmer<FilterState>({
    minLDK: 0,
    minLivingSize: 0,
    minPropertySize: 0,
    maxPrice: Infinity,
    location: "",
  });

  const value = {
    displayState,
    listingState,
    setDisplayState,
    setListingState,
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
