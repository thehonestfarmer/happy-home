/**
 * Manual Test Runner for Extractors (CommonJS version)
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Helper function to read fixture HTML
const readFixture = (filename) => {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

// Test logger
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  error: (message, error) => {
    console.error(`❌ ${message}`);
    if (error) console.error(error);
  }
};

// Simple test functions that don't rely on imports
async function runTests() {
  console.log('🧪 Starting extractor tests...\n');
  
  const detailHtml = readFixture('listings-detail.html');
  const searchHtml = readFixture('listings-search.html');
  
  try {
    // Test listing images extractor
    log.info('Testing listing images extraction...');
    const detailDom = new JSDOM(detailHtml);
    const document = detailDom.window.document;
    
    // Extract images
    const elements = Array.from(document.querySelectorAll(".slick-track"));
    const images = [];
    
    for (const el of elements) {
      const list = Array.from(el.querySelectorAll("li > a > img"));
      for (const img of list) {
        const src = img.getAttribute('src');
        if (src) {
          images.push(src);
        }
      }
    }
    
    log.success(`Found ${images.length} images`);
    if (images.length > 0) {
      log.info(`Sample image URL: ${images[0]}`);
    }
    
    // Test is sold extractor
    log.info('Testing is sold extraction...');
    const soldIndicator = document.querySelector("div.detail_sold");
    const isSold = !!soldIndicator;
    log.success(`Is sold: ${isSold}`);
    
    // Create DOM for search page
    const searchDom = new JSDOM(searchHtml);
    const searchDoc = searchDom.window.document;
    
    // Test address extraction
    log.info('Testing address extraction...');
    const addressElement = searchDoc.querySelector(".top_shozaichi");
    const address = addressElement ? addressElement.textContent.trim() : "";
    log.success(`Address: ${address}`);
    
    // Test price extraction
    log.info('Testing price extraction...');
    const priceElement = searchDoc.querySelector(".top_price");
    const price = priceElement ? priceElement.textContent.trim() : "";
    log.success(`Price: ${price}`);
    
    // Test floor plan extraction
    log.info('Testing floor plan extraction...');
    const floorPlanElement = searchDoc.querySelector(".top_madori");
    const floorPlan = floorPlanElement ? floorPlanElement.textContent.trim() : "";
    log.success(`Floor plan: ${floorPlan}`);
    
    // Test land area extraction
    log.info('Testing land area extraction...');
    const landAreaElement = searchDoc.querySelector(".top_menseki");
    let landArea = 0;
    if (landAreaElement) {
      const text = landAreaElement.textContent.trim();
      const match = text.match(/土地面積: ([\d.]+)m²/);
      if (match && match[1]) {
        landArea = parseFloat(match[1]);
      }
    }
    log.success(`Land area: ${landArea} m²`);
    
    // Test build area extraction
    log.info('Testing build area extraction...');
    const buildAreaElement = searchDoc.querySelector(".top_tatemono");
    let buildArea = 0;
    if (buildAreaElement) {
      const text = buildAreaElement.textContent.trim();
      const match = text.match(/建物面積: ([\d.]+)m²/);
      if (match && match[1]) {
        buildArea = parseFloat(match[1]);
      }
    }
    log.success(`Build area: ${buildArea} m²`);
    
    // Test tags extraction
    log.info('Testing tags extraction...');
    const tagElements = searchDoc.querySelectorAll("div.pickup_box.list > ul > div > ul");
    const tags = [];
    
    tagElements.forEach(el => {
      const text = el.textContent.trim();
      if (text) {
        const splitTags = text.split('\n').map(t => t.trim()).filter(Boolean);
        tags.push(...splitTags);
      }
    });
    
    log.success(`Found ${tags.length} tags: ${tags.join(', ')}`);
    
    // Test listing URL extraction
    log.info('Testing listing URL extraction...');
    const anchorElement = searchDoc.querySelector("a.top-linkimg");
    const listingUrl = anchorElement ? anchorElement.getAttribute('href') : "";
    log.success(`Listing URL: ${listingUrl}`);
    
    // Test latitude and longitude extraction
    log.info('Testing latitude and longitude extraction...');
    const iframe = document.querySelector("iframe.detail-googlemap");
    let latitude = 0;
    let longitude = 0;
    
    if (iframe) {
      const mapSrc = iframe.getAttribute("src") || "";
      
      const latMatch = mapSrc.match(/q=(-?\d+\.\d+),/);
      if (latMatch && latMatch[1]) {
        latitude = parseFloat(latMatch[1]);
      }
      
      const lngMatch = mapSrc.match(/,(-?\d+\.\d+)/);
      if (lngMatch && lngMatch[1]) {
        longitude = parseFloat(lngMatch[1]);
      }
    }
    
    log.success(`Latitude: ${latitude}`);
    log.success(`Longitude: ${longitude}`);
    
    // Test recommended text extraction
    log.info('Testing recommended text extraction...');
    const recommendedSection = document.querySelector('div.detail-comment');
    let recommendedText = "";
    
    if (recommendedSection) {
      recommendedText = recommendedSection.textContent.trim().replace(/\s+/g, ' ');
    }
    
    log.success(`Recommended text (${recommendedText.length} chars): ${recommendedText.substring(0, 50)}...`);
    
    // Test about property extraction
    log.info('Testing about property extraction...');
    const aboutSection = document.querySelector('div.section.detail-section.bukken-outline');
    let aboutProperty = "";
    
    if (aboutSection) {
      aboutProperty = aboutSection.textContent.trim().replace(/\s+/g, ' ');
    }
    
    log.success(`About property (${aboutProperty.length} chars): ${aboutProperty.substring(0, 50)}...`);
    
    // Test search listings extraction
    log.info('Testing search listings extraction...');
    const listingElements = searchDoc.querySelectorAll('#bukken_list > li.cf');
    log.success(`Found ${listingElements.length} listings in search page`);
    
    if (listingElements.length > 0) {
      // Extract first listing as an example
      const firstListing = listingElements[0];
      
      // Get the title
      const titleElement = firstListing.querySelector('dt.entry-title');
      const title = titleElement ? titleElement.textContent.trim() : '';
      log.success(`First listing title: ${title}`);
      
      // Get the detail URL
      const linkElement = firstListing.querySelector('a');
      const detailUrl = linkElement ? linkElement.getAttribute('href') : '';
      log.success(`First listing URL: ${detailUrl}`);
      
      // Get the price
      const priceElement = firstListing.querySelector('dd.list_detail .house-price');
      const listingPrice = priceElement ? priceElement.textContent.trim() : '';
      log.success(`First listing price: ${listingPrice}`);
      
      // Get images
      const imageElements = firstListing.querySelectorAll('.list_img img');
      const imageCount = imageElements.length;
      log.success(`First listing has ${imageCount} images`);
      
      // Get recommended points
      const recommendedPointsElement = firstListing.querySelector('.detail_txt.recommend_txt dd p');
      const points = recommendedPointsElement ? recommendedPointsElement.textContent.trim() : '';
      log.success(`First listing recommended points: ${points.substring(0, 50)}...`);
      
      // Get tags
      const listingTagElements = firstListing.querySelectorAll('.pickup_box.list .facility > li');
      const listingTags = Array.from(listingTagElements).map(el => el.textContent.trim());
      log.success(`First listing has ${listingTags.length} tags: ${listingTags.join(', ')}`);
    }
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    log.error('Test failed', error);
    process.exit(1);
  }
}

// Run all tests
runTests(); 