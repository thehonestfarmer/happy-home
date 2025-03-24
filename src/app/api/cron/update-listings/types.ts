export interface Listing {
  id: string;
  addresses: string;
  address?: string;
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
  [key: string]: Listing;
}

export interface LegacyListingsData {
  newListings: {
    [key: string]: Listing;
  };
}

export interface ScrapedData {
  addresses: string[];
  englishAddress: string[];
  tags: string[];
  listingDetail: string[];
  prices: string[];
  layout: string[];
  buildSqMeters: string[];
  landSqMeters: string[];
  ids: string[];
} 