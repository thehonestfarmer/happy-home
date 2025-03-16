/**
 * Simple Scraper Script for Shiawase Home Listings
 * Scrapes the first page of listings and their details
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const puppeteer = require('puppeteer');

// Define basic interfaces for TypeScript
interface ExtractorMapping {
  databaseColumn: string;
  extractorFunction: string;
  isRequired: boolean;
  defaultValue?: any;
  postProcessor?: string;
}

interface ListingData {
  [key: string]: any;
  listing_url?: string;
}

// Simple error type
const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  PARSER: 'PARSER_ERROR',
  LISTING_REMOVED: 'LISTING_REMOVED',
  BROWSER: 'BROWSER_ERROR'
};

// Simple logger
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg: string) => console.warn(`[WARNING] ${msg}`),
  error: (msg: string, error?: any) => {
    if (error) {
      console.error(`[ERROR] ${msg}`, error);
    } else {
      console.error(`[ERROR] ${msg}`);
    }
  }
};

// Simple error handling 
function createNetworkError(message: string) {
  return { 
    type: ERROR_TYPES.NETWORK, 
    message 
  };
}

function createBrowserError(message: string) {
  return {
    type: ERROR_TYPES.BROWSER,
    message
  };
}

function isListingRemoved(error: any) {
  return error && error.type === ERROR_TYPES.LISTING_REMOVED;
}

const writeFileAsync = promisify(fs.writeFile);

// More robust browser utilities
async function initBrowser(retryCount = 3) {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      logger.info(`Initializing browser (attempt ${attempt}/${retryCount})...`);
      
      // More robust browser options
      const browser = await puppeteer.launch({ 
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Prevents crashes in Docker containers
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
        ignoreHTTPSErrors: true,
        timeout: 60000, // Longer timeout for browser launch
      });
      
      // Set up event listeners for unexpected browser closure
      browser.on('disconnected', () => {
        logger.warn('Browser disconnected unexpectedly!');
      });
      
      logger.success("Browser initialized successfully");
      return browser;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to launch browser (attempt ${attempt}/${retryCount}): ${errorMessage}`);
      
      if (attempt === retryCount) {
        throw createBrowserError(`Failed to launch browser after ${retryCount} attempts: ${errorMessage}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs a return
  throw createBrowserError(`Failed to launch browser after ${retryCount} attempts`);
}

async function closeBrowser(browser: any) {
  if (!browser) return;
  
  try {
    logger.info("Closing browser");
    await browser.close();
    logger.success("Browser closed successfully");
  } catch (error) {
    logger.error("Error closing browser", error);
    // Try force closing if regular close fails
    try {
      process.kill(browser.process().pid);
      logger.info("Force closed browser process");
    } catch (killError) {
      logger.error("Failed to force close browser", killError);
    }
  }
}

async function navigateToPage(page: any, url: string, timeout = 60000) {
  logger.info(`Navigating to ${url}`);
  
  try {
    // Setup page options
    await page.setDefaultNavigationTimeout(timeout);
    await page.setRequestInterception(true);
    
    // Block unnecessary resources to speed up loading
    page.on('request', (request: any) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Set up user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the page with more robust error handling
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: timeout 
    });
    
    if (!response) {
      throw createNetworkError(`Failed to load ${url}: No response received`);
    }
    
    // Check for HTTP errors
    const status = response.status();
    if (status >= 400) {
      throw createNetworkError(`Failed to load ${url}: HTTP status ${status}`);
    }
    
    logger.success(`Successfully loaded ${url}`);
    return page;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Navigation error for ${url}`, error);
    throw createNetworkError(`Failed to navigate to ${url}: ${errorMessage}`);
  }
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 */
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      // Check if we should retry based on error type
      const isRetryable = 
        error.type === ERROR_TYPES.NETWORK ||
        (error.message && error.message.includes('net::ERR_'));
      
      if (!isRetryable || retries >= maxRetries) {
        throw error;
      }
      
      retries++;
      const delay = baseDelay * Math.pow(2, retries);
      logger.warn(`Retry ${retries}/${maxRetries} after ${delay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Extract data using Puppeteer directly on the listings page
 */
async function extractListingData(page: any, listingSelector: string): Promise<ListingData | null> {
  try {
    // Check if the listing element exists
    const elementExists = await page.evaluate((selector: string) => {
      return !!document.querySelector(selector);
    }, listingSelector);
    
    if (!elementExists) {
      throw new Error(`Listing element not found: ${listingSelector}`);
    }
    
    // Extract basic data from the listing row - we'll create a custom extraction function
    // that understands the structure of the page
    const listingData = await page.evaluate((selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      
      // This function needs to be updated with the actual page structure
      // Let's assume we're dealing with a table row structure
      const cells = element.querySelectorAll('td');
      if (!cells || cells.length === 0) return null;
      
      // Create a basic data object
      const data: any = {};
      
      // Example: Extract listing URL
      const linkElement = element.querySelector('a[href]');
      if (linkElement) {
        data.listing_url = new URL(linkElement.getAttribute('href') || '', window.location.origin).toString();
      }
      
      // Attempt to extract address
      try {
        // For example: looking for address in a specific cell
        if (cells[2]) {
          data.address = cells[2].textContent?.trim() || null;
          data.english_address = cells[2].textContent?.trim() || null;
        }
      } catch (e) {
        console.error('Error extracting address');
      }
      
      // Attempt to extract price
      try {
        if (cells[1]) {
          const priceText = cells[1].textContent?.trim() || '';
          const priceMatch = priceText.match(/総額\s*([0-9,]+)万円/);
          if (priceMatch) {
            data.price = priceMatch[1] + "万円";
          }
        }
      } catch (e) {
        console.error('Error extracting price');
      }
      
      // Attempt to extract floor plan
      try {
        if (cells[3]) {
          const floorPlanMatch = cells[3].textContent?.match(/間取り\s*(.+)/) || [];
          data.floor_plan = floorPlanMatch[1]?.trim() || null;
        }
      } catch (e) {
        console.error('Error extracting floor plan');
      }
      
      // Attempt to extract building area
      try {
        // Look for building area information
        const buildAreaMatch = element.textContent?.match(/建物面積\s*([0-9.]+)㎡/) || [];
        data.build_area_sqm = buildAreaMatch[1] || null;
      } catch (e) {
        console.error('Error extracting building area');
      }
      
      // Attempt to extract land area
      try {
        // Look for land area information
        const landAreaMatch = element.textContent?.match(/土地面積\s*([0-9.]+)㎡/) || [];
        data.land_area_sqm = landAreaMatch[1] || null;
      } catch (e) {
        console.error('Error extracting land area');
      }
      
      // Extract tags
      try {
        data.tags = [];
        // Look for tag elements or keywords in the description
        const tagMatches = element.textContent?.match(/(システムキッチン|駐車|リフォーム|即入居|南向)/g) || [];
        if (tagMatches.length > 0) {
          data.tags = tagMatches;
        }
      } catch (e) {
        console.error('Error extracting tags');
      }
      
      return data;
    }, listingSelector);
    
    if (!listingData) {
      throw new Error(`Failed to extract data from listing: ${listingSelector}`);
    }
    
    // Visit detail page if URL was extracted
    if (listingData.listing_url) {
      const detailUrl = listingData.listing_url;
      logger.info(`Visiting detail page: ${detailUrl}`);
      
      // Navigate to detail page with retry
      await retryWithBackoff(async () => {
        try {
          await navigateToPage(page, detailUrl);
        } catch (error: any) {
          throw createNetworkError(`Failed to load detail page: ${error.message}`);
        }
      });
      
      // Extract data from the detail page using Puppeteer
      const detailData = await page.evaluate(() => {
        const data: any = {};
        
        // Extract listing images
        try {
          const imageElements = document.querySelectorAll('.asset_body img');
          data.listing_images = Array.from(imageElements).map((img: Element) => 
            (img as HTMLImageElement).src
          ).filter(Boolean);
        } catch (e) {
          console.error('Error extracting listing images');
          data.listing_images = [];
        }
        
        // Extract recommended or highlighted text
        try {
          const recommendedElement = document.querySelector('.recommend_body');
          if (recommendedElement) {
            data.recommended_text = recommendedElement.textContent?.trim() || null;
          }
        } catch (e) {
          console.error('Error extracting recommended text');
        }
        
        // Check if listing is sold
        try {
          // Look for "sold" or "contract" indicators
          const soldText = document.body.textContent || '';
          data.is_sold = /売約済み|契約済み|SOLD OUT/i.test(soldText);
        } catch (e) {
          console.error('Error checking if listing is sold');
          data.is_sold = false;
        }
        
        // Extract property details
        try {
          const detailsText = Array.from(document.querySelectorAll('.spec_table tr'))
            .map(tr => tr.textContent?.trim())
            .filter(Boolean)
            .join('\n');
          
          data.about_property = detailsText || null;
        } catch (e) {
          console.error('Error extracting about property');
        }
        
        // Try to extract latitude/longitude from any map elements
        try {
          // Check if there's a Google Maps iframe
          const mapIframe = document.querySelector('iframe[src*="maps.google"]');
          if (mapIframe) {
            const src = mapIframe.getAttribute('src') || '';
            const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (match) {
              data.lat = match[1];
              data.long = match[2];
            }
          }
        } catch (e) {
          console.error('Error extracting map coordinates');
        }
        
        return data;
      });
      
      // Combine data
      return { ...listingData, ...detailData };
    }
    
    return listingData;
  } catch (error: any) {
    if (isListingRemoved(error)) {
      logger.warn(`Listing appears to be removed: ${listingSelector}`);
      return null;
    }
    
    logger.error(`Error extracting listing data:`, error);
    throw error;
  }
}

/**
 * Main scraping function with improved error handling
 */
async function scrapeListings() {
  let browser;
  let currentResults: ListingData[] = [];
  
  try {
    // Initialize browser with retries
    browser = await initBrowser(3);
    
    // Create a new page
    const page = await browser.newPage();
    
    // URL to scrape
    const url = 'https://www.shiawasehome-reuse.com/?bukken=jsearch&shub=1&kalb=0&kahb=kp120&tochimel=0&tochimeh=&mel=0&meh=';
    
    // Navigate to the page with retry logic
    await retryWithBackoff(async () => {
      await navigateToPage(page, url);
    });
    
    // Debug: Take a screenshot to see what's loaded
    try {
      await page.screenshot({ path: 'debug-page.png' });
      logger.info('Saved screenshot to debug-page.png');
    } catch (error) {
      logger.warn('Failed to save screenshot:', error);
    }
    
    // Wait for table to load - updating the selector to match the actual website structure
    try {
      await page.waitForSelector('.bukken_list table', { timeout: 30000 });
    } catch (error) {
      logger.error('Failed to find listings table - the page may not have loaded correctly', error);
      
      // Take one more screenshot for debugging
      try {
        await page.screenshot({ path: 'error-page.png' });
        logger.info('Saved error state screenshot to error-page.png');
      } catch {}
      
      throw error;
    }
    
    // Get all listing elements on the page
    const listingSelectors = await page.evaluate(() => {
      try {
        // Target the listing table rows - adjust the selector based on page inspection
        const rows = Array.from(document.querySelectorAll('.bukken_list table tbody tr'));
        
        // Filter out header rows or empty rows by checking if they have at least one link
        const validRows = rows.filter(row => row.querySelector('a'));
        
        // Return the selectors for these rows
        return validRows.map((_, index) => `.bukken_list table tbody tr:nth-child(${index + 1})`);
      } catch (e) {
        console.error('Error getting listing selectors', e);
        return [];
      }
    });
    
    if (!listingSelectors || listingSelectors.length === 0) {
      logger.warn('No listing selectors found. Taking a screenshot for debugging...');
      await page.screenshot({ path: 'no-listings.png' });
      throw new Error('No listings found on the page');
    }
    
    logger.info(`Found ${listingSelectors.length} listings on the first page.`);
    
    // Extract data from each listing
    const allListings: ListingData[] = [];
    
    // Limit to a few listings for testing
    const maxListings = process.env.MAX_LISTINGS ? parseInt(process.env.MAX_LISTINGS) : listingSelectors.length;
    const listingsToProcess = listingSelectors.slice(0, maxListings);
    
    for (let i = 0; i < listingsToProcess.length; i++) {
      logger.info(`Processing listing ${i + 1}/${listingsToProcess.length}...`);
      
      try {
        const data = await extractListingData(page, listingsToProcess[i]);
        if (data) {
          allListings.push(data);
          currentResults = [...allListings]; // Save progress
          
          // Save intermediate results periodically
          if (i % 5 === 0 && i > 0) {
            try {
              const tempPath = path.join(process.cwd(), 'new-listings-partial.json');
              await writeFileAsync(tempPath, JSON.stringify({ newListings: currentResults }, null, 2), 'utf8');
              logger.info(`Saved intermediate results (${currentResults.length} listings) to new-listings-partial.json`);
            } catch (saveError) {
              logger.warn('Failed to save intermediate results');
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to process listing ${i + 1}:`, error);
        
        // Check if browser disconnected
        try {
          // A simple command to check if browser is still connected
          await page.title();
        } catch (connectionError) {
          logger.error('Browser connection lost, stopping scraping', connectionError);
          break;
        }
        
        // Continue with other listings instead of halting everything
      }
    }
    
    // Save the data to a JSON file
    const outputPath = path.join(process.cwd(), 'new-listings.json');
    await writeFileAsync(outputPath, JSON.stringify({ newListings: allListings }, null, 2), 'utf8');
    
    logger.success(`Successfully scraped ${allListings.length} listings.`);
    logger.success(`Data saved to ${outputPath}`);
    
  } catch (error) {
    logger.error('Scraping failed:', error);
    
    // Save any partial results
    if (currentResults.length > 0) {
      try {
        const failsafePath = path.join(process.cwd(), 'new-listings-partial.json');
        await writeFileAsync(failsafePath, JSON.stringify({ newListings: currentResults }, null, 2), 'utf8');
        logger.info(`Saved partial results (${currentResults.length} listings) despite error to new-listings-partial.json`);
      } catch (saveError) {
        logger.error('Failed to save partial results after error', saveError);
      }
    }
  } finally {
    if (browser) {
      await closeBrowser(browser);
      logger.info('Browser closed.');
    }
  }
}

// Execute the scraper
scrapeListings().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});