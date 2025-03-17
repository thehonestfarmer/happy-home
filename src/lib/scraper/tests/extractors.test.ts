/**
 * Extractor Tests
 * 
 * Tests for extractor functions using static HTML fixtures.
 */

import fs from 'fs';
import path from 'path';
import { testExtractListingImages } from '../extractors/listing-images';
import { testExtractIsSold } from '../extractors/is-sold';
import { testExtractAddress, testExtractEnglishAddress } from '../extractors/address';
import { 
  testExtractPrice, 
  testExtractFloorPlan, 
  testExtractLandArea, 
  testExtractBuildArea 
} from '../extractors/price-area';
import { testExtractTags, testExtractListingUrl } from '../extractors/tags-url';
import { testExtractLatitude, testExtractLongitude } from '../extractors/latitude-longitude';
import { testExtractRecommendedText } from '../extractors/recommended-text';
import { testExtractAboutProperty } from '../extractors/about-property';
import { testExtractSearchListings } from '../extractors/search-listings';

// Helper function to read fixture HTML
const readFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

describe('Listing Images Extractor', () => {
  it('should extract images from a detail page', async () => {
    const html = readFixture('listings-detail.html');
    const images = await testExtractListingImages(html);
    
    // Expectations
    expect(images).toBeDefined();
    expect(Array.isArray(images)).toBe(true);
    
    // Verify that extracted images are URLs (if any were found)
    if (images.length > 0) {
      for (const image of images) {
        expect(typeof image).toBe('string');
        expect(image).toMatch(/^https?:\/\//); // Should start with http:// or https://
      }
    }
  });
});

describe('Is Sold Extractor', () => {
  it('should detect if a property is marked as sold', async () => {
    const html = readFixture('listings-detail.html');
    const isSold = await testExtractIsSold(html);
    
    // Test based on fixture content
    expect(typeof isSold).toBe('boolean');
  });
});

describe('Address Extractors', () => {
  it('should extract address from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const address = await testExtractAddress(html);
    
    expect(typeof address).toBe('string');
  });

  it('should handle address translation placeholder in test environment', async () => {
    const html = readFixture('listings-search.html');
    const address = await testExtractEnglishAddress(html);
    
    expect(typeof address).toBe('string');
    // Since translation is mocked in tests, it should be the same as original
    const originalAddress = await testExtractAddress(html);
    expect(address).toEqual(originalAddress);
  });
});

describe('Price and Area Extractors', () => {
  it('should extract price from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const price = await testExtractPrice(html);
    
    expect(typeof price).toBe('string');
  });

  it('should extract floor plan from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const floorPlan = await testExtractFloorPlan(html);
    
    expect(typeof floorPlan).toBe('string');
  });

  it('should extract land area from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const landArea = await testExtractLandArea(html);
    
    expect(typeof landArea).toBe('number');
  });

  it('should extract build area from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const buildArea = await testExtractBuildArea(html);
    
    expect(typeof buildArea).toBe('number');
  });
});

describe('Tags and URL Extractors', () => {
  it('should extract tags from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const tags = await testExtractTags(html);
    
    expect(Array.isArray(tags)).toBe(true);
  });

  it('should extract listing URL from a listing page', async () => {
    const html = readFixture('listings-search.html');
    const url = await testExtractListingUrl(html);
    
    expect(typeof url).toBe('string');
  });
});

describe('Latitude and Longitude Extractors', () => {
  it('should extract latitude from a detail page', async () => {
    const html = readFixture('listings-detail.html');
    const latitude = await testExtractLatitude(html);
    
    expect(typeof latitude).toBe('number');
  });

  it('should extract longitude from a detail page', async () => {
    const html = readFixture('listings-detail.html');
    const longitude = await testExtractLongitude(html);
    
    expect(typeof longitude).toBe('number');
  });
});

describe('Recommended Text Extractor', () => {
  it('should extract recommended text from a detail page', async () => {
    const html = readFixture('listings-detail.html');
    const recommendedText = await testExtractRecommendedText(html);
    
    expect(typeof recommendedText).toBe('string');
  });
});

describe('About Property Extractor', () => {
  it('should extract property description from a detail page', async () => {
    const html = readFixture('listings-detail.html');
    const aboutProperty = await testExtractAboutProperty(html);
    
    expect(typeof aboutProperty).toBe('string');
  });
});

describe('Search Listings Extractor', () => {
  it('should extract all listings from a search results page', async () => {
    const html = readFixture('listings-search.html');
    const listings = await testExtractSearchListings(html);
    
    // Expectations
    expect(listings).toBeDefined();
    expect(Array.isArray(listings)).toBe(true);
    
    // If listings were found, validate their structure
    if (listings.length > 0) {
      const firstListing = listings[0];
      
      // Check that all required properties exist
      expect(firstListing).toHaveProperty('title');
      expect(firstListing).toHaveProperty('detailUrl');
      expect(firstListing).toHaveProperty('price');
      expect(firstListing).toHaveProperty('isNew');
      expect(firstListing).toHaveProperty('isUpdated');
      expect(firstListing).toHaveProperty('address');
      expect(firstListing).toHaveProperty('floorPlan');
      expect(firstListing).toHaveProperty('images');
      expect(firstListing).toHaveProperty('buildArea');
      expect(firstListing).toHaveProperty('landArea');
      expect(firstListing).toHaveProperty('nearestStation');
      expect(firstListing).toHaveProperty('builtDate');
      expect(firstListing).toHaveProperty('transactionType');
      expect(firstListing).toHaveProperty('recommendedPoints');
      expect(firstListing).toHaveProperty('tags');
      
      // Basic type checks
      expect(typeof firstListing.title).toBe('string');
      expect(typeof firstListing.detailUrl).toBe('string');
      expect(Array.isArray(firstListing.images)).toBe(true);
      expect(Array.isArray(firstListing.tags)).toBe(true);
    }
  });
});

// Add more tests for other extractors as they are implemented 