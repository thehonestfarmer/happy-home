export interface Listing {
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
}

export interface ListingsData {
  newListings: {
    [key: string]: Listing;
  };
}

export interface ScrapedData {
  addresses: string[];
  tags: string[][];
  listingDetail: string[];
  prices: string[];
  layout: string[];
  buildSqMeters: string[];
  landSqMeters: string[];
  ids: string[];
} 