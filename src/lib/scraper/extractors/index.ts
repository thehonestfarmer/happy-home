/**
 * Extractors Index
 * 
 * Exports all individual extractor functions and provides a registry
 * for the mapping configuration to reference.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { extractListingImages } from './listing-images';
import { extractIsSold } from './is-sold';
import { extractAddress, extractEnglishAddress } from './address';
import { extractPrice, extractFloorPlan, extractLandArea, extractBuildArea } from './price-area';
import { extractTags, extractListingUrl } from './tags-url';
import { extractLatitude, extractLongitude } from './latitude-longitude';
import { extractRecommendedText } from './recommended-text';
import { extractAboutProperty } from './about-property';
import { extractSearchListings } from './search-listings';

// Define the extractor type for consistency
export type Extractor<T> = (page: Page) => TE.TaskEither<Error, T>;

// Export all extractors
export {
  extractListingImages,
  extractIsSold,
  extractAddress,
  extractEnglishAddress,
  extractPrice,
  extractFloorPlan,
  extractLandArea,
  extractBuildArea,
  extractTags,
  extractListingUrl,
  extractLatitude,
  extractLongitude,
  extractRecommendedText,
  extractAboutProperty,
  extractSearchListings
};

// Registry of all extractors to be used with the mapping configuration
export const extractorRegistry = {
  // Listing page extractors
  extractAddress,
  extractEnglishAddress,
  extractPrice,
  extractFloorPlan,
  extractLandArea,
  extractBuildArea,
  extractTags,
  extractListingUrl,
  
  // Detail page extractors
  extractListingImages,
  extractIsSold,
  extractLatitude,
  extractLongitude,
  extractRecommendedText,
  extractAboutProperty,
  
  // Search page extractors
  extractSearchListings
};

// Registry of post-processors
export const postProcessorRegistry = {
  convertToMillionJPY: (price: string): number => {
    // Convert price string like "693万円" to number in million JPY (6.93)
    const match = price.match(/(\d+)万円/);
    if (match && match[1]) {
      return parseInt(match[1], 10) / 100; // Convert to million JPY
    }
    return 0;
  }
}; 