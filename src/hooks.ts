import { PROPERTIES, SLIDES } from "@/app/fixtures";
import { useEffect, useState } from "react";
import type { ListingsData, Listing } from "./app/api/cron/update-listings/types";
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

// Function to format listing detail text
function formatListingDetail(text: string): string {
  if (!text) return '';
  
  // Trim whitespace from beginning and end
  let formattedText = text.trim();
  
  // Remove "Recommended points" if present
  formattedText = formattedText.replace(/^\s*おすすめポイント\s*$/m, '').replace(/^\s*Recommended points\s*$/m, '');
  
  // Insert newline before each ★ symbol (except the first one)
  formattedText = formattedText.replace(/★/g, '\n★').replace(/^\n/, '');
  
  // Trim again to remove any extra whitespace created during processing
  return formattedText.trim();
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
        
        const responseData = await response.json();
        
        // Check for success response structure
        if (!responseData.success) {
          throw new Error(responseData.error || 'Failed to fetch listings');
        }
        
        // Extract the actual listings data from the response
        const listingsData = responseData.data as ListingsData;
        
        if (!listingsData) {
          throw new Error('Invalid listings data format');
        }
        
        // Process listings similar to before
        const processedListings = Object.entries(listingsData).map(([id, item]) => {
          const listingImages = item.listingImages || [];

          // Calculate full price in JPY
          const price = parseJapanesePrice(item.price || '0');

          // Convert JPY to USD using exchange rate utility
          const priceUsd = convertCurrency(price, "JPY", "USD");

          // Process listingDetail if it exists
          const listingDetail = item.listingDetail ? formatListingDetail(item.listingDetail) : '';

          return {
            ...item,
            listingImages,
            price,
            priceUsd,
            listingDetail,
          };
        });

        setListings(processedListings);
      } catch (err) {
        console.error('Error loading listings:', err);
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
