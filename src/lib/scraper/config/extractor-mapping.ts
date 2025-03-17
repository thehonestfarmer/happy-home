/**
 * Extractor Mapping Configuration
 * 
 * Maps database columns to specific extractor functions.
 * This provides a configuration-driven approach to extraction,
 * making it easy to add new fields or modify existing ones.
 */

export interface ExtractorMapping {
  databaseColumn: string;      // Supabase column name
  extractorFunction: string;   // Reference to function in extractors directory
  isRequired: boolean;         // Whether this field is required
  defaultValue?: any;          // Default value if extraction fails
  postProcessor?: string;      // Optional post-processing function
}

/**
 * Listing page extractor mapping
 * For scraping the main search results page
 */
export const listingExtractorMap: ExtractorMapping[] = [
  {
    databaseColumn: "address",
    extractorFunction: "extractAddress",
    isRequired: true
  },
  {
    databaseColumn: "english_address",
    extractorFunction: "extractEnglishAddress",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "price",
    extractorFunction: "extractPrice",
    isRequired: true,
    postProcessor: "convertToMillionJPY"
  },
  {
    databaseColumn: "floor_plan",
    extractorFunction: "extractFloorPlan",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "land_area_sqm",
    extractorFunction: "extractLandArea",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "build_area_sqm",
    extractorFunction: "extractBuildArea",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "tags",
    extractorFunction: "extractTags",
    isRequired: false,
    defaultValue: []
  },
  {
    databaseColumn: "listing_url",
    extractorFunction: "extractListingUrl",
    isRequired: true
  }
];

/**
 * Detail page extractor mapping
 * For scraping individual listing detail pages
 */
export const detailExtractorMap: ExtractorMapping[] = [
  {
    databaseColumn: "lat",
    extractorFunction: "extractLatitude",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "long",
    extractorFunction: "extractLongitude",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "listing_images",
    extractorFunction: "extractListingImages",
    isRequired: false,
    defaultValue: []
  },
  {
    databaseColumn: "recommended_text",
    extractorFunction: "extractRecommendedText",
    isRequired: false,
    defaultValue: null
  },
  {
    databaseColumn: "is_sold",
    extractorFunction: "extractIsSold",
    isRequired: false,
    defaultValue: false
  },
  {
    databaseColumn: "about_property",
    extractorFunction: "extractAboutProperty",
    isRequired: false,
    defaultValue: null
  }
]; 