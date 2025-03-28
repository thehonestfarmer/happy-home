export interface Listing {
  id: string;
  addresses: string;
  address?: string;
  tags: string;
  listingDetail: string;
  listingDetailUrl?: string;
  prices: string;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
  coordinates?: {
    lat: number | null;
    long: number | null;
  };
  removed?: boolean;
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