import { PROPERTIES, SLIDES } from "@/app/fixtures";
import { useEffect, useState } from "react";
import type { ListingsData } from "./app/api/cron/update-listings/types";
import { convertCurrency } from "./lib/listing-utils";
import { parseJapanesePrice } from "./lib/listing-utils";

interface ProcessedListing {
  id: string;
  addresses: string;
  tags: string;
  listingDetail: string;
  prices: string;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
  priceUsd: number;
  // Include any other properties from PROPERTIES that you need
  [key: string]: any;
}

export function useLoadListings() {
  const [listings, setListings] = useState<ProcessedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch('/api/listings');
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        
        const data = await response.json();
        const { newListings } = data.data as ListingsData;
        
        // Process listings similar to before
        const processedListings = Object.entries(newListings).map(([id, item]) => {
          const listingImages = item.listingImages;

          // Calculate full price in JPY
          const price = parseJapanesePrice(item.price);

          // Convert JPY to USD using exchange rate utility
          const priceUsd = convertCurrency(price, "JPY", "USD");


          return {
            ...item,
            id,
            listingImages,
            price,
            priceUsd,
          };
        });

        setListings(processedListings);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, []);

  return {
    listings,
    isLoading,
    error
  };
}
