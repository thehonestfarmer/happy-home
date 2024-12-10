"use client";
import React, { createContext, useState, useContext } from "react";
import { useImmer } from "use-immer";

const AppContext = createContext({});

export type FilterProps = {
  minLDK: number;
  minLivingSize: number;
  minPropertySize: number;
  location: string;
};

export const AppProvider = ({ children }) => {
  const [displayState, setDisplayState] = useImmer({
    lightboxListingIdx: null,
    drawerOpen: false,
  });

  const [listingState, setListingState] = useImmer({
    minLDK: 0,
    minLivingSize: 0,
    minPropertySize: 0,
    maxPrice: Infinity,
  });

  const value = {
    displayState,
    listingState,
    setDisplayState,
    setListingState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
