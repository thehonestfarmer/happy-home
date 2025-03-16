/**
 * Manual Test Runner for Extractors
 * 
 * This script tests all extractors against the test fixture files
 * and logs the results to the console.
 */

import fs from 'fs';
import path from 'path';
import { testExtractListingImages } from '../extractors/listing-images.js';
import { testExtractIsSold } from '../extractors/is-sold.js';
import { testExtractAddress, testExtractEnglishAddress } from '../extractors/address.js';
import { 
  testExtractPrice, 
  testExtractFloorPlan, 
  testExtractLandArea, 
  testExtractBuildArea 
} from '../extractors/price-area.js';
import { testExtractTags, testExtractListingUrl } from '../extractors/tags-url.js';
import { testExtractLatitude, testExtractLongitude } from '../extractors/latitude-longitude.js';
import { testExtractRecommendedText } from '../extractors/recommended-text.js';
import { testExtractAboutProperty } from '../extractors/about-property.js';

// Helper function to read fixture HTML
const readFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

// Test logger
const log = {
  info: (message: string) => console.log(`ℹ️ ${message}`),
  success: (message: string) => console.log(`✅ ${message}`),
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`);
    if (error) console.error(error);
  }
};

// Run all tests
async function runTests() {
  console.log('🧪 Starting extractor tests...\n');
  
  const detailHtml = readFixture('listings-detail.html');
  const searchHtml = readFixture('listings-search.html');
  
  try {
    // Test listing images extractor
    log.info('Testing listing images extractor...');
    const images = await testExtractListingImages(detailHtml);
    log.success(`Found ${images.length} images`);
    if (images.length > 0) {
      log.info(`Sample image URL: ${images[0]}`);
    }
    
    // Test is sold extractor
    log.info('Testing is sold extractor...');
    const isSold = await testExtractIsSold(detailHtml);
    log.success(`Is sold: ${isSold}`);
    
    // Test address extractors
    log.info('Testing address extractors...');
    const address = await testExtractAddress(searchHtml);
    log.success(`Address: ${address}`);
    
    const englishAddress = await testExtractEnglishAddress(searchHtml);
    log.success(`English address: ${englishAddress}`);
    
    // Test price and area extractors
    log.info('Testing price and area extractors...');
    const price = await testExtractPrice(searchHtml);
    log.success(`Price: ${price}`);
    
    const floorPlan = await testExtractFloorPlan(searchHtml);
    log.success(`Floor plan: ${floorPlan}`);
    
    const landArea = await testExtractLandArea(searchHtml);
    log.success(`Land area: ${landArea} m²`);
    
    const buildArea = await testExtractBuildArea(searchHtml);
    log.success(`Build area: ${buildArea} m²`);
    
    // Test tags and URL extractors
    log.info('Testing tags and URL extractors...');
    const tags = await testExtractTags(searchHtml);
    log.success(`Found ${tags.length} tags: ${tags.join(', ')}`);
    
    const listingUrl = await testExtractListingUrl(searchHtml);
    log.success(`Listing URL: ${listingUrl}`);
    
    // Test latitude and longitude extractors
    log.info('Testing latitude and longitude extractors...');
    const latitude = await testExtractLatitude(detailHtml);
    log.success(`Latitude: ${latitude}`);
    
    const longitude = await testExtractLongitude(detailHtml);
    log.success(`Longitude: ${longitude}`);
    
    // Test recommended text extractor
    log.info('Testing recommended text extractor...');
    const recommendedText = await testExtractRecommendedText(detailHtml);
    log.success(`Recommended text (${recommendedText.length} chars): ${recommendedText.substring(0, 50)}...`);
    
    // Test about property extractor
    log.info('Testing about property extractor...');
    const aboutProperty = await testExtractAboutProperty(detailHtml);
    log.success(`About property (${aboutProperty.length} chars): ${aboutProperty.substring(0, 50)}...`);
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    log.error('Test failed', error);
    process.exit(1);
  }
}

// Run all tests
runTests(); 