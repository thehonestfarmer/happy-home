import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { createReadStream } from "fs";
import path from "path";
import { pipe } from "fp-ts/lib/function.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import * as A from "fp-ts/lib/Array.js";
import * as O from "fp-ts/lib/Option.js";
import { createInterface } from "readline";
import translate from "translate";
import { addFailedJob, removeFailedJob } from './failed-jobs-manager';
import { scrapingQueue } from '@/lib/queue';
import type { ListingsData } from './types';

// Types
export type Listing = {
  listingUrl?: string;
  url?: string;
  id: string;
  [key: string]: any;
};

export type ExtractedData = {
  tags?: string[];
  translatedTags?: { [key: string]: string };
  description?: string;
  latLong?: { lat: number; long: number };
  latLongString?: string;
  isRemoved?: boolean;
  message?: string;
  exists?: boolean;
  url?: string;
  [key: string]: any;
};

export type Extractor = (page: Page) => TE.TaskEither<Error, ExtractedData>;
export type ExtractorPipeline = (page: Page) => TE.TaskEither<Error, ExtractedData>;

// Utility functions
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Logger utility with timestamp and categories
const logger = {
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔍 DEBUG: ${message}`);
    if (data) console.dir(data, { depth: null, colors: true });
  },
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️ INFO: ${message}`);
    if (data) console.dir(data, { depth: null, colors: true });
  },
  warning: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️ WARNING: ${message}`);
    if (data) console.dir(data, { depth: null, colors: true });
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR: ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(error.stack);
      } else {
        console.dir(error, { depth: null, colors: true });
      }
    }
  },
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ SUCCESS: ${message}`);
    if (data) console.dir(data, { depth: null, colors: true });
  },
};

// Browser management
export const initBrowser = (): TE.TaskEither<Error, Browser> => 
  TE.tryCatch(
    async () => {
      logger.info("Initializing browser");
      const browser = await puppeteer.launch({ headless: true });
      logger.success("Browser initialized successfully");
      return browser;
    },
    reason => {
      logger.error("Failed to launch browser", reason);
      return new Error(`Failed to launch browser: ${reason}`);
    }
  );

const closeBrowser = (browser: Browser): TE.TaskEither<Error, void> => 
  TE.tryCatch(
    async () => {
      logger.info("Closing browser");
      await browser.close();
      logger.success("Browser closed successfully");
    },
    reason => {
      logger.error("Failed to close browser", reason);
      return new Error(`Failed to close browser: ${reason}`);
    }
  );

export const navigateToPage = (url: string) => (browser: Browser): TE.TaskEither<Error, Page> => 
  TE.tryCatch(
    async () => {
      logger.info(`Navigating to URL: ${url}`);
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(30000);
      
      // Configure page to handle JavaScript dialogs automatically
      page.on('dialog', async dialog => {
        logger.info(`Auto-dismissing dialog: ${dialog.type()} with message: ${dialog.message()}`);
        await dialog.dismiss();
      });
      
      try {
        await page.goto(url, { waitUntil: "networkidle0" });
        logger.success(`Successfully loaded page: ${url}`);
        return page;
      } catch (e) {
        logger.error(`Navigation failed for ${url}`, e);
        await page.close();
        throw e;
      }
    },
    reason => {
      logger.error(`Failed to navigate to ${url}`, reason);
      return new Error(`Failed to navigate to ${url}: ${reason}`);
    }
  );

// Extractors
export const extractAndTranslateTags: Extractor = (page) => 
  TE.tryCatch(
    async () => {
      const url = page.url();
      logger.info(`Extracting tags from ${url}`);
      
      // Extract tags from the page
      const originalTags = await page.$$eval(
        ".tag_list li, .property-tags span, .detail_txt.recommend_txt li, meta[name='keywords']",
        elements => {
          // Try different selectors based on page structure
          const allTags: string[] = [];
          
          // Extract from list items or spans
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text) allTags.push(text);
          });
          
          // Extract from meta keywords if available
          const metaKeywords = elements.find(el => el.getAttribute('name') === 'keywords');
          if (metaKeywords) {
            const content = metaKeywords.getAttribute('content');
            if (content) {
              content.split(',').map(tag => tag.trim()).forEach(tag => {
                if (tag) allTags.push(tag);
              });
            }
          }
          
          // Also look for keywords in description
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            const descContent = metaDesc.getAttribute('content');
            if (descContent) {
              // Extract keywords from description that look like property features
              const keywordMatches = descContent.match(/★([^★]+)/g);
              if (keywordMatches) {
                keywordMatches.forEach(match => {
                  const cleaned = match.replace('★', '').trim();
                  if (cleaned) allTags.push(cleaned);
                });
              }
            }
          }
          
          return [...new Set(allTags)]; // Remove duplicates
        }
      );
      
      logger.info(`Found ${originalTags.length} tags: ${originalTags.join(', ')}`);
      
      // Store original Japanese tags before translation
      const japaneseTags = [...originalTags];
      
      // Translate tags to English
      const translatedTags: string[] = [];
      logger.info(`Starting translation of ${originalTags.length} tags`);
      
      for (const tag of originalTags) {
        try {
          // Skip translation for numeric values or very short strings
          if (/^\d+(\.\d+)?$/.test(tag) || tag.length <= 2) {
            logger.debug(`Skipping translation for "${tag}" (numeric or too short)`);
            translatedTags.push(tag);
            continue;
          }
          
          logger.debug(`Translating tag: "${tag}"`);
          const translated = await translate(tag, { from: 'ja', to: 'en' });
          translatedTags.push(translated);
          logger.debug(`Translated: "${tag}" → "${translated}"`);
          
          // Add a small delay to avoid rate limiting
          await sleep(200);
        } catch (error) {
          logger.error(`Failed to translate "${tag}"`, error);
          translatedTags.push(tag); // Use original if translation fails
        }
      }
      
      logger.success(`Tag extraction and translation completed for ${url}`);
      return { 
        tags: translatedTags,
        japaneseTags // Also provide the original tags for reference
      };
    },
    reason => {
      logger.error(`Failed to extract and translate tags`, reason);
      return new Error(`Failed to extract and translate tags: ${reason}`);
    }
  );

export const extractDescription: Extractor = (page) => 
  TE.tryCatch(
    async () => {
      const url = page.url();
      logger.info(`Extracting description from ${url}`);
      
      const description = await page.$eval(
        ".listing_description",
        el => el.textContent?.trim() || ""
      ).catch(() => {
        logger.warning(`No description element found at ${url}`);
        return "";
      });
      
      logger.info(`Description extracted, length: ${description.length} characters`);
      return { description };
    },
    reason => {
      logger.error(`Failed to extract description`, reason);
      return new Error(`Failed to extract description: ${reason}`);
    }
  );

export const extractLatLongAsString: Extractor = (page) => 
  TE.tryCatch(
    async () => {
      const url = page.url();
      logger.info(`Extracting latitude/longitude from ${url}`);
      
      // Define retry parameters
      const maxRetries = 2; 
      const retryDelay = 500;
      
      let latLongData = null;
      let isInterceptionEnabled = false;
      
      // Store potential coordinate data from network requests
      const coordinatesFromRequests: Array<{lat: number, long: number, source: string}> = [];
      
      // Store event handler references so we can remove them later
      const responseHandler = async (response: any) => {
        const url = response.url();
        
        // Only process responses that might contain map data
        if (url.includes('maps.google') || 
            url.includes('api/maps') || 
            url.includes('geocode') || 
            url.includes('coordinates') ||
            url.toLowerCase().includes('map')) {
          
          try {
            // Try to get JSON data
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              const responseJson = await response.json().catch(() => null);
              if (responseJson) {
                logger.debug(`Found potential map data in network response from ${url}`);
                
                // Search for lat/lng patterns in the response
                const jsonStr = JSON.stringify(responseJson);
                
                // Look for common coordinate patterns in JSON responses
                const patterns = [
                  /"lat":\s*(-?\d+\.\d+).*?"lng":\s*(-?\d+\.\d+)/i,
                  /"latitude":\s*(-?\d+\.\d+).*?"longitude":\s*(-?\d+\.\d+)/i,
                  /"y":\s*(-?\d+\.\d+).*?"x":\s*(-?\d+\.\d+)/i,
                  /\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/
                ];
                
                for (const pattern of patterns) {
                  const match = jsonStr.match(pattern);
                  if (match && match[1] && match[2]) {
                    const lat = parseFloat(match[1]);
                    const lng = parseFloat(match[2]);
                    
                    // Validate coordinates are in reasonable range
                    if (!isNaN(lat) && !isNaN(lng) && 
                        Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                      logger.info(`Found coordinates in network request: ${lat},${lng}`);
                      coordinatesFromRequests.push({
                        lat,
                        long: lng,
                        source: `network-response-${url.substring(0, 30)}`
                      });
                    }
                  }
                }
              }
            }
          } catch (error) {
            // Silently continue if we can't parse a response
          }
        }
      };
      
      const requestHandler = (request: any) => {
        if (isInterceptionEnabled) {
          request.continue();
        }
      };

      // 1. Set up network request interception to capture coordinates from API calls
      try {
        // First disable any existing interception if enabled
        try {
          await page.setRequestInterception(false);
        } catch (e) {
          // Ignore errors when disabling existing interception
        }
        
        // Now enable request interception
        await page.setRequestInterception(true);
        isInterceptionEnabled = true;
        logger.info(`Successfully enabled request interception for ${url}`);
        
        // Listen for responses that might contain coordinate data
        page.on('response', responseHandler);
        
        // Continue all requests
        page.on('request', requestHandler);

        // Wait a bit longer for any maps to initialize and make their API calls
        logger.info(`Waiting for maps to initialize and potential API calls...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if we captured coordinates from network requests
        if (coordinatesFromRequests.length > 0) {
          // Use the first set of coordinates found
          const { lat, long, source } = coordinatesFromRequests[0];
          latLongData = { lat, long, source };
          logger.success(`Using coordinates from network traffic: ${lat},${long}`);
        }
      } catch (error: any) {
        logger.warning(`Error during network interception: ${error?.message || 'Unknown error'}`);
      } finally {
        // Remove event listeners to prevent memory leaks
        try {
          page.off('response', responseHandler);
          page.off('request', requestHandler);
        } catch (e) {
          // Ignore errors when removing listeners
        }
        
        // Always disable request interception when done to clean up
        if (isInterceptionEnabled) {
          try {
            await page.setRequestInterception(false);
            isInterceptionEnabled = false;
            logger.debug(`Disabled request interception for ${url}`);
          } catch (e) {
            // Ignore errors when disabling
          }
        }
      }
      
      // If we already have coordinates from network requests, we can skip further extraction
      if (!latLongData) {
        // Try multiple attempts to extract coordinates
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (attempt > 1) {
            // Only add a small delay for subsequent attempts
            logger.info(`Attempt ${attempt}/${maxRetries}: Retrying coordinate extraction...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            logger.info(`Attempt ${attempt}/${maxRetries}: Extracting coordinates...`);
          }
          
          // First try to wait for any map elements to fully render and extract coordinates
          try {
            // Wait for common map containers to be ready
            await page.waitForFunction(() => {
              // Check for Google Maps elements fully loaded
              const mapElements = document.querySelectorAll('.gm-style, [id^="map"], [class*="map"], iframe[src*="maps.google"]');
              return mapElements.length > 0;
            }, { timeout: 3000 }).catch(() => {
              // Map elements might not be present or might use different classes - that's okay
              logger.debug('No standard map elements detected within timeout');
            });
            
            // Extract coordinates from the fully rendered page
            const dynamicCoords = await page.evaluate(() => {
              // Look for coordinates in Google Maps objects that might be created after page load
              try {
                // Look for Google Maps objects in the global scope
                // @ts-ignore - Access window.google which might not be defined in TS
                if (window.google && window.google.maps) {
                  console.log("[Browser Context] Found Google Maps API on the page!");
                  // Try to find map instances
                  const maps: any[] = [];
                  // @ts-ignore
                  if (window.google.maps.Map && window.google.maps.Map.instances) {
                    // @ts-ignore
                    maps.push(...window.google.maps.Map.instances);
                  }
                  
                  // Look for map objects in the global scope
                  for (const key in window) {
                    try {
                      const obj = (window as any)[key];
                      if (
                        obj && 
                        typeof obj === 'object' && 
                        obj.getCenter && 
                        typeof obj.getCenter === 'function'
                      ) {
                        maps.push(obj);
                      }
                    } catch (e) {
                      // Ignore errors when accessing properties
                    }
                  }
                  
                  // Extract center coordinates from the first map found
                  if (maps.length > 0) {
                    for (const map of maps) {
                      try {
                        const center = map.getCenter();
                        if (center && typeof center.lat === 'function' && typeof center.lng === 'function') {
                          const lat = center.lat();
                          const lng = center.lng();
                          console.log(`[Browser Context] Found map center coordinates: ${lat}, ${lng}`);
                          return { lat, long: lng, source: 'google-maps-api' };
                        }
                      } catch (e) {
                        console.error(`[Browser Context] Error getting map center:`, e);
                      }
                    }
                  }
                }
                
                // Look for inline map data that might have been dynamically added
                const mapDataElements = document.querySelectorAll(
                  '[data-lat][data-lng], [data-latitude][data-longitude], [data-coordinates]'
                );
                
                if (mapDataElements.length > 0) {
                  const element = mapDataElements[0];
                  let lat: number | undefined;
                  let lng: number | undefined;
                  
                  if (element.hasAttribute('data-lat') && element.hasAttribute('data-lng')) {
                    const latAttr = element.getAttribute('data-lat');
                    const lngAttr = element.getAttribute('data-lng');
                    if (latAttr !== null && lngAttr !== null) {
                      lat = parseFloat(latAttr);
                      lng = parseFloat(lngAttr);
                    }
                  } else if (element.hasAttribute('data-latitude') && element.hasAttribute('data-longitude')) {
                    const latAttr = element.getAttribute('data-latitude');
                    const lngAttr = element.getAttribute('data-longitude');
                    if (latAttr !== null && lngAttr !== null) {
                      lat = parseFloat(latAttr);
                      lng = parseFloat(lngAttr);
                    }
                  } else if (element.hasAttribute('data-coordinates')) {
                    const coordsAttr = element.getAttribute('data-coordinates');
                    if (coordsAttr !== null) {
                      const coords = coordsAttr.split(',');
                      if (coords.length === 2) {
                        lat = parseFloat(coords[0]);
                        lng = parseFloat(coords[1]);
                      }
                    }
                  }
                  
                  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
                    console.log(`[Browser Context] Found coordinates in data attributes: ${lat}, ${lng}`);
                    return { lat, long: lng, source: 'dynamic-data-attributes' };
                  }
                }
                
                // Check for dynamically generated anchor links to maps
                const dynamicMapLinks = document.querySelectorAll('a[href*="maps.google.com"]');
                if (dynamicMapLinks.length > 0) {
                  for (const link of dynamicMapLinks) {
                    const href = link.getAttribute('href') || '';
                    
                    // Look for coordinates in various URL patterns
                    const llMatch = href.match(/maps\.google\.com\/maps\?ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (llMatch) {
                      const lat = parseFloat(llMatch[1]);
                      const lng = parseFloat(llMatch[2]);
                      console.log(`[Browser Context] Found coordinates in dynamically created Google Maps link: ${lat}, ${lng}`);
                      return { lat, long: lng, source: 'dynamic-map-link' };
                    }
                    
                    // Check alternate formats
                    const qMatch = href.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (qMatch) {
                      const lat = parseFloat(qMatch[1]);
                      const lng = parseFloat(qMatch[2]);
                      console.log(`[Browser Context] Found coordinates in q parameter of map link: ${lat}, ${lng}`);
                      return { lat, long: lng, source: 'dynamic-map-link-q' };
                    }
                  }
                }
                
                // Japanese real estate sites often have a specific variable pattern for coordinates
                // Check if any scripts were dynamically added with coordinate data
                const allScripts = document.querySelectorAll('script');
                const scriptsArray = Array.from(allScripts);
                
                // Look at the last few scripts that might have been dynamically added
                const recentScripts = scriptsArray.slice(Math.max(0, scriptsArray.length - 5));
                
                for (const script of recentScripts) {
                  if (!script.textContent) continue;
                  
                  // Look for map initialization
                  if (script.textContent.includes('maps.google.com')) {
                    // Check for coordinates in the script
                    const llMatch = script.textContent.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (llMatch) {
                      const lat = parseFloat(llMatch[1]);
                      const lng = parseFloat(llMatch[2]);
                      console.log(`[Browser Context] Found coordinates in dynamically added script: ${lat}, ${lng}`);
                      return { lat, long: lng, source: 'dynamic-script' };
                    }
                  }
                }
              } catch (error) {
                console.error('[Browser Context] Error extracting dynamic coordinates:', error);
              }
              
              return null;
            });
            
            if (dynamicCoords) {
              latLongData = dynamicCoords;
              logger.success(`Found coordinates from dynamic page content: ${dynamicCoords.lat},${dynamicCoords.long}`);
              break;
            }
          } catch (error: any) {
            logger.warning(`Error waiting for maps to render: ${error?.message || 'Unknown error'}`);
          }
          
          // If dynamic extraction failed, look for coordinates in various places using the original method
          latLongData = await page.evaluate(() => {
            try {
              const results: { lat?: number; long?: number; source?: string } = {};
              
              console.log(`[Browser Context] Looking for coordinates in page`);
              
              // Method 7: Check anchor links to Google Maps (MOVED UP - higher priority based on feedback)
              console.log("[Browser Context] Method 1 (priority): Checking anchor links to Google Maps for ll parameter");
              const mapLinks = document.querySelectorAll('a[href*="maps.google.com"]');
              for (const link of mapLinks) {
                const href = link.getAttribute('href') || '';
                
                // Look specifically for the ll= parameter which contains coordinates
                const llMatch = href.match(/maps\.google\.com\/maps\?ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (llMatch) {
                  console.log(`[Browser Context] Found Google Maps link with precise coordinates: ${llMatch[1]}, ${llMatch[2]}`);
                  results.lat = parseFloat(llMatch[1]);
                  results.long = parseFloat(llMatch[2]);
                  results.source = 'anchor-link-maps-ll';
                  return results; // Return immediately as this is the most reliable source
                }
                
                // Also check for alternate ll parameter format
                const altLlMatch = href.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (altLlMatch) {
                  console.log(`[Browser Context] Found coordinates in anchor link ll parameter: ${altLlMatch[1]}, ${altLlMatch[2]}`);
                  results.lat = parseFloat(altLlMatch[1]);
                  results.long = parseFloat(altLlMatch[2]);
                  results.source = 'anchor-link-ll-param';
                  return results;
                }
                
                // Also check for q parameter which sometimes contains coordinates
                const qMatch = href.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (qMatch) {
                  console.log(`[Browser Context] Found coordinates in anchor link q parameter: ${qMatch[1]}, ${qMatch[2]}`);
                  results.lat = parseFloat(qMatch[1]);
                  results.long = parseFloat(qMatch[2]);
                  results.source = 'anchor-link-q-param';
                  return results;
                }
              }
              
              // Method 1: Look for Google Maps API initialization
              console.log("[Browser Context] Method 2: Checking script tags");
              const scripts = Array.from(document.querySelectorAll('script'));
              for (const script of scripts) {
                if (!script.textContent) continue;
                
                // Look for Google Maps coordinates
                const latMatch = script.textContent.match(/var\s+mlat\s*=\s*([\d\.]+)/);
                const lngMatch = script.textContent.match(/var\s+mlng\s*=\s*([\d\.]+)/);
                
                if (latMatch && lngMatch) {
                  console.log(`[Browser Context] Found coordinates in script: ${latMatch[1]}, ${lngMatch[1]}`);
                  results.lat = parseFloat(latMatch[1]);
                  results.long = parseFloat(lngMatch[1]);
                  results.source = 'script';
                  break;
                }
                
                // NEW METHOD: Look for coordinates in string format like 'var ju = "37.959,139.337"'
                // Make the pattern more flexible to catch different variable names and formats
                const coordPairMatch = script.textContent.match(/var\s+\w+\s*=\s*["']([0-9]+\.[0-9]+),([0-9]+\.[0-9]+)["']/);
                if (!coordPairMatch) {
                  // Try alternate format with variable declaration
                  const altCoordMatch = script.textContent.match(/\w+\s*=\s*["']([0-9]+\.[0-9]+),([0-9]+\.[0-9]+)["']/);
                  if (altCoordMatch) {
                    console.log(`[Browser Context] Found coordinate pair in alternate format: ${altCoordMatch[1]}, ${altCoordMatch[2]}`);
                    results.lat = parseFloat(altCoordMatch[1]);
                    results.long = parseFloat(altCoordMatch[2]);
                    results.source = 'script-string-pair-alt';
                    break;
                  }
                } else {
                  console.log(`[Browser Context] Found coordinate pair in script: ${coordPairMatch[1]}, ${coordPairMatch[2]}`);
                  results.lat = parseFloat(coordPairMatch[1]);
                  results.long = parseFloat(coordPairMatch[2]);
                  results.source = 'script-string-pair';
                  break;
                }
                
                // Look specifically for fudo_map_elevation variable which often precedes coordinates in Japanese real estate sites
                if (script.textContent.includes('fudo_map_elevation') || script.textContent.includes('gmapmark')) {
                  console.log('[Browser Context] Found fudo_map_elevation or gmapmark - searching for nearby coordinates');
                  
                  // Look for maps.google.com with coordinates
                  const mapsMatch = script.textContent.match(/maps\.google\.com\/maps\?ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                  if (mapsMatch) {
                    console.log(`[Browser Context] Found Google Maps URL with coordinates near fudo_map_elevation: ${mapsMatch[1]}, ${mapsMatch[2]}`);
                    results.lat = parseFloat(mapsMatch[1]);
                    results.long = parseFloat(mapsMatch[2]);
                    results.source = 'fudo-map-elevation-nearby';
                    break;
                  }
                }
                
                // Method 6 (Tertiary fallback): Look specifically for 'ju' variable which often contains lat/long on Japanese real estate sites
                const juMatch = script.textContent.match(/var\s+ju\s*=\s*["']([0-9]+\.[0-9]+),([0-9]+\.[0-9]+)["']/);
                if (juMatch) {
                  console.log(`[Browser Context] Found coordinates in 'ju' variable: ${juMatch[1]}, ${juMatch[2]}`);
                  results.lat = parseFloat(juMatch[1]);
                  results.long = parseFloat(juMatch[2]);
                  results.source = 'ju-variable';
                  break;
                }
              }
              
              // Method 2: Look for meta tags with geo information
              if (!results.lat || !results.long) {
                console.log("[Browser Context] Method 3: Checking meta geo tags");
                const geoPosition = document.querySelector('meta[name="geo.position"]');
                if (geoPosition) {
                  const content = geoPosition.getAttribute('content');
                  if (content && content.includes(';')) {
                    const [lat, long] = content.split(';').map(c => parseFloat(c.trim()));
                    console.log(`[Browser Context] Found coordinates in meta tag: ${lat}, ${long}`);
                    results.lat = lat;
                    results.long = long;
                    results.source = 'meta';
                  }
                }
              }
              
              // Method 3: Look for microdata
              if (!results.lat || !results.long) {
                console.log("[Browser Context] Method 4: Checking microdata");
                const microdata = document.querySelector('[itemtype*="geo"][itemprop="geo"]');
                if (microdata) {
                  const lat = microdata.querySelector('[itemprop="latitude"]')?.getAttribute('content');
                  const long = microdata.querySelector('[itemprop="longitude"]')?.getAttribute('content');
                  
                  if (lat && long) {
                    console.log(`[Browser Context] Found coordinates in microdata: ${lat}, ${long}`);
                    results.lat = parseFloat(lat);
                    results.long = parseFloat(long);
                    results.source = 'microdata';
                  }
                }
              }
              
              // Method 4: Extract from any element with data-lat and data-lng attributes
              if (!results.lat || !results.long) {
                console.log("[Browser Context] Method 5: Checking data attributes");
                const mapElement = document.querySelector('[data-lat][data-lng]');
                if (mapElement) {
                  const lat = mapElement.getAttribute('data-lat');
                  const lng = mapElement.getAttribute('data-lng');
                  
                  if (lat && lng) {
                    console.log(`[Browser Context] Found coordinates in data attributes: ${lat}, ${lng}`);
                    results.lat = parseFloat(lat);
                    results.long = parseFloat(lng);
                    results.source = 'data-attributes';
                  }
                }
              }
              
              // Method 5: Look for iframe with Google Maps URL
              if (!results.lat || !results.long) {
                console.log("[Browser Context] Method 6: Checking iframes");
                const mapIframe = document.querySelector('iframe[src*="maps.google"]');
                if (mapIframe) {
                  const src = mapIframe.getAttribute('src');
                  if (src) {
                    const qMatch = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (qMatch) {
                      console.log(`[Browser Context] Found coordinates in iframe: ${qMatch[1]}, ${qMatch[2]}`);
                      results.lat = parseFloat(qMatch[1]);
                      results.long = parseFloat(qMatch[2]);
                      results.source = 'iframe';
                    }
                    
                    // Also check for ll parameter in iframes
                    const llMatch = src.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (llMatch) {
                      console.log(`[Browser Context] Found coordinates in iframe ll parameter: ${llMatch[1]}, ${llMatch[2]}`);
                      results.lat = parseFloat(llMatch[1]);
                      results.long = parseFloat(llMatch[2]);
                      results.source = 'iframe-ll-param';
                    }
                  }
                }
              }
              
              // Method 6: Look for Google Maps links with ll parameter and maps.google.com URLs
              if (!results.lat || !results.long) {
                console.log("[Browser Context] Method 7: Checking for Google Maps links with ll parameter in scripts");
                
                // Check scripts for maps.google.com/maps with ll parameter
                const scripts = Array.from(document.getElementsByTagName('script'));
                for (const script of scripts) {
                  const content = script.textContent || '';
                  
                  if (content.includes('maps.google.com/maps') || content.includes('fudo_map_elevation')) {
                    // Look for ll parameter pattern
                    const latLngMatch = content.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    
                    if (latLngMatch) {
                      console.log(`[Browser Context] Found coordinates in script with ll parameter: ${latLngMatch[1]}, ${latLngMatch[2]}`);
                      results.lat = parseFloat(latLngMatch[1]);
                      results.long = parseFloat(latLngMatch[2]);
                      results.source = 'script-ll-parameter';
                      break;
                    }
                    
                    // Alternative pattern with full URL
                    const mapMatch = content.match(/https:\/\/maps\.google\.com\/maps\?ll=([^&]+)/);
                    if (mapMatch && mapMatch[1] && mapMatch[1].includes(',')) {
                      const [lat, lng] = mapMatch[1].split(',').map(parseFloat);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        console.log(`[Browser Context] Found coordinates in script with Google Maps URL: ${lat}, ${lng}`);
                        results.lat = lat;
                        results.long = lng;
                        results.source = 'script-google-maps-url';
                        break;
                      }
                    }
                  }
                }
              }
              
              return results;
            } catch (error) {
              console.error("[Browser Context] Error extracting coordinates:", error);
              return null;
            }
          });
          
          if (latLongData && latLongData.lat && latLongData.long) {
            logger.success(`Found coordinates on attempt ${attempt}: ${latLongData.lat},${latLongData.long} (source: ${latLongData.source || 'unknown'})`);
            break; // Break the retry loop if we found coordinates
          } else {
            logger.warning(`No coordinates found on attempt ${attempt}`);
            // Continue to next attempt if we still have retries left
          }
        }
      }
      
      if (latLongData && latLongData.lat && latLongData.long) {
        const lat = latLongData.lat;
        const long = latLongData.long;
        const latLongString = `${lat},${long}`;
        
        logger.success(`Successfully extracted coordinates: ${latLongString} (source: ${latLongData.source || 'unknown'})`);
        return {
          latLong: { lat, long },
          latLongString
        };
      } else {
        logger.warning(`No coordinates found for ${url} after ${maxRetries} attempts`);
        logger.error(`EXTRACTION FAILED: This listing will remain in the failed jobs list until coordinates can be extracted`);
        logger.debug(`Attempted methods: network interception, dynamic page content, static page elements`);
        return {};
      }
    },
    reason => {
      logger.error(`Failed to extract lat/long`, reason);
      return new Error(`Failed to extract lat/long: ${reason}`);
    }
  );

/**
 * Extractor function that checks if a listing exists (not 404/removed)
 * If the listing is removed/not found, it marks it for removal from the database
 */
export const checkIfListingExists: Extractor = (page) => 
  TE.tryCatch(
    async () => {
      const url = page.url();
      logger.info(`Checking if listing exists at ${url}`);
      
      const removed = await isRemovedListing(page);
      
      if (removed) {
        // Extract listing ID from the URL pattern
        // This is a fallback in case the ID wasn't provided elsewhere
        let listingId = "unknown";
        try {
          // Try multiple extraction strategies for ID
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          
          // Strategy 1: Last segment with cleanup
          if (pathSegments.length > 0) {
            const lastSegment = pathSegments[pathSegments.length - 1];
            listingId = lastSegment.replace(/\.(html|php|z|aspx|jsp)$/i, '');
          }
          
          // Strategy 2: If too short, use more path segments
          if (listingId.length < 3 && pathSegments.length > 1) {
            listingId = pathSegments.slice(-2).join('_');
          }
          
          // Strategy 3: Try full path if still too short
          if (listingId.length < 3) {
            listingId = pathSegments.join('_');
          }
        } catch (err) {
          // If we can't extract the ID, continue with "unknown"
          logger.warning(`Failed to extract ID from URL: ${url}`, err);
        }
        
        logger.warning(`Listing at ${url} (ID: ${listingId}) appears to be removed or not found`);
        
        // Try to remove the listing from database immediately if we have an ID
        if (listingId !== "unknown") {
          try {
            // Try a few variations of the ID to maximize chances of finding it
            const idVariations = [
              listingId,
              listingId.replace(/\./g, '_'),
              listingId.replace(/-/g, '_')
            ];
            
            let removed = false;
            for (const id of idVariations) {
              if (await removeListingFromDatabase(id)) {
                logger.success(`Removed listing ${id} from database during existence check`);
                removed = true;
                break;
              }
            }
            
            if (!removed) {
              logger.warning(`Could not find listing ID ${listingId} in database to remove`);
            }
          } catch (removeError) {
            logger.error(`Error removing listing ${listingId} from database:`, removeError);
          }
        }
        
        return {
          isRemoved: true,
          message: 'Listing has been removed from the website or is a 404 page',
          url, // Include the URL for reference
          extractedId: listingId
        };
      }
      
      logger.success(`Listing at ${url} exists and is accessible`);
      return {
        isRemoved: false,
        exists: true
      };
    },
    reason => {
      logger.error(`Failed to check if listing exists`, reason);
      return new Error(`Failed to check if listing exists: ${reason}`);
    }
  );

// Combine multiple extractors
const combineExtractors = (...extractors: Extractor[]): ExtractorPipeline => (page) => {
  logger.info(`Creating extractor pipeline with ${extractors.length} extractors`);
  
  // First, ensure checkIfListingExists is the first extractor
  // This is crucial for early stopping if a listing is removed
  const orderedExtractors = [...extractors];
  if (orderedExtractors.length > 1) {
    // If checkIfListingExists is in the array but not first, move it to first position
    const existsIndex = orderedExtractors.findIndex(ext => ext === checkIfListingExists);
    if (existsIndex > 0) {
      // Remove it from its current position
      orderedExtractors.splice(existsIndex, 1);
      // Add it at the beginning
      orderedExtractors.unshift(checkIfListingExists);
      logger.debug(`Reordered extractors to ensure checkIfListingExists runs first`);
    } else if (existsIndex === -1) {
      // If it's not in the array, add it at the beginning
      orderedExtractors.unshift(checkIfListingExists);
      logger.debug(`Added checkIfListingExists as the first extractor`);
    }
  }
  
  // Run extractors sequentially, stopping early if listing is removed
  return pipe(
    TE.Do,
    TE.chain(result => {
      // Run the first extractor (checkIfListingExists) first
      return pipe(
        orderedExtractors[0](page),
        TE.map(firstResult => {
          return { ...result, ...firstResult };
        })
      );
    }),
    TE.chain(result => {
      // Check if listing is removed - if so, stop early
      if (result.isRemoved) {
        logger.info(`Listing is marked as removed, stopping extraction pipeline early`);
        return TE.right(result);
      }
      
      // Otherwise, run the remaining extractors in parallel
      const remainingExtractors = orderedExtractors.slice(1);
      if (remainingExtractors.length === 0) {
        return TE.right(result);
      }
      
      return pipe(
        remainingExtractors,
        A.map(extractor => extractor(page)),
        A.sequence(TE.ApplicativePar), // Now we can run the rest in parallel
        TE.map(results => {
          return results.reduce((acc, curr) => ({ ...acc, ...curr }), result);
        })
      );
    })
  );
};

/**
 * Detects if a page is a 404/removed listing page based on specific HTML patterns
 */
const isRemovedListing = async (page: Page): Promise<boolean> => {
  try {
    // Check for common patterns in 404/removed listing pages
    const isRemoved = await page.evaluate(() => {
      // Check 1: Page title contains "Nothing found for" or similar
      const title = document.title;
      if (title && (
        title.includes("Nothing found for") || 
        title.includes("アクセスしようとしたページが見つかりません") ||
        title.includes("404") ||
        title.includes("Not Found") ||
        title.includes("お探しのページは見つかりませんでした") ||
        title.includes("ページが存在しません")
      )) {
        console.log("[Removal check] Found removal indicator in title:", title);
        return true;
      }

      // Check 2: Page contains an error-404 section
      const errorSection = document.querySelector('.error-404, .error404, .not-found, .error, .error-page');
      if (errorSection) {
        console.log("[Removal check] Found error section with class:", errorSection.className);
        return true;
      }

      // Check 3: Page contains specific text about the page not being found
      const pageContent = document.body.textContent;
      if (pageContent && (
        pageContent.includes("アクセスしようとしたページがみつかりません") ||
        pageContent.includes("お探しのページはすでに公開を終了") ||
        pageContent.includes("page cannot be found") ||
        pageContent.includes("page no longer exists") ||
        pageContent.includes("ページが見つかりません") ||
        pageContent.includes("お探しのページは見つかりませんでした") ||
        pageContent.includes("お探しのページは削除されたか") ||
        pageContent.includes("物件は既に成約済みか、削除された可能性があります") ||
        pageContent.includes("アクセスしようとしたページが見つかりません") ||
        pageContent.includes("the page you are looking for has been removed")
      )) {
        console.log("[Removal check] Found removal indicator in page content");
        return true;
      }

      // Check 4: Check for specific HTML patterns in Japanese real estate site 404 pages
      // Look for specific divs with error messages
      const errorDivs = document.querySelectorAll('.Error, .error-page, .error-content, .notfound, .not-found');
      if (errorDivs.length > 0) {
        console.log("[Removal check] Found error div elements:", errorDivs.length);
        return true;
      }

      // Check 5: Check for no listing content
      // If the page is missing crucial listing elements that should be present
      const listingElements = document.querySelectorAll('.property-detail, .listing-detail, .property-info');
      
      // Check 6: Look for links that might indicate a 404 page
      const errorLinks = document.querySelectorAll('a[href="/"], .contact-link, a.openhouse_link');
      // If there are prominent links back to the homepage (common in 404 pages) and no listing details
      if (errorLinks.length > 0 && listingElements.length === 0) {
        console.log("[Removal check] Found error links without listing elements");
        return true;
      }

      return false;
    });
    
    if (isRemoved) {
      logger.info(`Page detected as removed/404`);
      return true;
    }
    
    // Additional check: Status code check
    const status = await page.evaluate(() => {
      // Some sites store HTTP status in meta tags or script data
      const meta = document.querySelector('meta[name="http-status"]');
      if (meta && meta.getAttribute('content') === '404') {
        return 404;
      }
      
      // Check if the page redirected to a 404 page
      if (window.location.href.includes('/404') || 
          window.location.href.includes('not-found') || 
          window.location.href.includes('error')) {
        return 404;
      }
      
      return 200; // Assume 200 if we can't detect otherwise
    });
    
    if (status === 404) {
      logger.info(`Page status indicates 404`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.warning(`Error checking if listing is removed:`, error);
    // If we had an error checking, we should assume the page might not exist
    // Better to err on the side of caution
    return false;
  }
};

/**
 * Removes a listing from all-listings.json
 */
export const removeListingFromDatabase = async (
  listingId: string,
  databasePath: string = path.join(process.cwd(), "all-listings.json")
): Promise<boolean> => {
  try {
    logger.info(`Attempting to remove listing ${listingId} from database at ${databasePath}`);
    
    // Check if the database file exists
    try {
      await fsPromises.access(databasePath);
    } catch (error) {
      logger.warning(`Database file not found at ${databasePath}, nothing to remove`);
      return false;
    }
    
    // Read the database file
    const data = await fsPromises.readFile(databasePath, 'utf8');
    let listings: ListingsData;
    
    try {
      listings = JSON.parse(data);
    } catch (error) {
      logger.error(`Failed to parse database file as JSON:`, error);
      return false;
    }
    
    // Check if the listing exists
    if (!listings.newListings || !listings.newListings[listingId]) {
      logger.warning(`Listing ${listingId} not found in database, nothing to remove`);
      return false;
    }
    
    // Get URL for logging - handle the potential missing properties
    const listing = listings.newListings[listingId];
    const listingUrl = (listing as any).url || (listing as any).listingUrl || 'unknown URL';
    
    // Store listing info for logging
    logger.info(`Found listing to remove: ${listingId} (${listingUrl})`);
    
    // Remove the listing
    delete listings.newListings[listingId];
    logger.success(`Removed listing ${listingId} from database object`);
    
    // Write the updated database back to file
    await fsPromises.writeFile(databasePath, JSON.stringify(listings, null, 2));
    logger.success(`Updated database file at ${databasePath} - listing ${listingId} removed`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to remove listing ${listingId} from database:`, error);
    return false;
  }
};

// Update the processListing function to check for removed listings
const processListing = (
  listingUrl: string,
  extractorPipeline: ExtractorPipeline,
  listingId: string
) => (browser: Browser): TE.TaskEither<Error, ExtractedData> => {
  return pipe(
    navigateToPage(listingUrl)(browser),
    TE.chain(page => 
      TE.tryCatch(
        async () => {
          try {
            // First check if the listing has been removed
            const removed = await isRemovedListing(page);
            
            if (removed) {
              logger.info(`Listing ${listingId} (${listingUrl}) appears to be removed`);
              
              // Only attempt to remove if we have a valid listingId (not "unknown")
              if (listingId && listingId !== "unknown") {
                // Remove from database
                await removeListingFromDatabase(listingId);
                logger.success(`Removed listing ${listingId} from database`);
              } else {
                // Extract listing ID from the URL pattern as a fallback - improved extraction logic
                try {
                  // Try multiple extraction strategies
                  let potentialId = null;
                  
                  // Strategy 1: Extract from URL path
                  const urlObj = new URL(listingUrl);
                  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                  
                  // Get the last segment which is often the slug/ID
                  if (pathSegments.length > 0) {
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    
                    // Clean up the segment by removing file extensions or trailing characters
                    potentialId = lastSegment.replace(/\.(html|php|z|aspx|jsp)$/i, '');
                    
                    // If the potential ID is very short, try the second-to-last segment + last segment
                    if (potentialId.length < 3 && pathSegments.length > 1) {
                      const secondLastSegment = pathSegments[pathSegments.length - 2];
                      potentialId = `${secondLastSegment}_${potentialId}`;
                    }
                  }
                  
                  // Strategy 2: Create a standardized ID from the URL path
                  if (!potentialId || potentialId.length < 3) {
                    // Use the city and property name pattern
                    const cityAndPropertyPattern = pathSegments.join('_');
                    if (cityAndPropertyPattern.length > 0) {
                      potentialId = cityAndPropertyPattern;
                    }
                  }
                  
                  // Strategy 3: If still no ID, use the whole normalized pathname
                  if (!potentialId || potentialId.length < 3) {
                    potentialId = urlObj.pathname
                      .replace(/\//g, '_')
                      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
                  }
                  
                  if (potentialId) {
                    logger.info(`Attempting to remove listing with extracted ID: ${potentialId}`);
                    
                    // Also try with common prefixes we might use in our database
                    const possibleIds = [
                      potentialId,
                      potentialId.replace(/\./g, '_'), // Replace dots with underscores
                      pathSegments.join('_')  // Join all path segments with underscores
                    ];
                    
                    let removed = false;
                    for (const id of possibleIds) {
                      if (await removeListingFromDatabase(id)) {
                        logger.success(`Successfully removed listing with ID: ${id} from database`);
                        removed = true;
                        break;
                      }
                    }
                    
                    if (!removed) {
                      logger.warning(`Could not find any matching listing ID in database for removed listing: ${listingUrl}`);
                    }
                  } else {
                    logger.warning(`Could not extract a valid ID from URL: ${listingUrl}`);
                  }
                } catch (err) {
                  logger.error(`Failed to parse URL or remove listing: ${err}`);
                }
              }
              
              // Return an empty object with a special flag indicating the listing was removed
              return { 
                isRemoved: true,
                message: 'Listing has been removed from the website'
              };
            }
            
            // If not removed, proceed with extraction
            const result = await extractorPipeline(page)();
            await page.close();
            
            if (result._tag === 'Left') {
              throw result.left;
            }
            
            return result.right;
          } catch (error) {
            if (page) {
              await page.close();
            }
            throw error;
          }
        },
        error => error instanceof Error 
          ? error 
          : new Error(`Failed to process listing: ${error}`)
      )
    )
  );
};

// Stream large JSON file to avoid memory issues
const streamJsonFile = <T>(
  filePath: string,
  callback: (entry: T) => Promise<void>
): Promise<void> => {
  logger.info(`Starting to stream file: ${filePath}`);
  
  return new Promise((resolve, reject) => {
    // Ensure the file exists
    fsPromises.access(filePath)
      .then(async () => {
        logger.debug(`File exists: ${filePath}`);
        
        try {
          // First, read a small part of the file to detect its structure
          const sampleStream = createReadStream(filePath, { 
            encoding: "utf8",
            start: 0,
            end: 1000 // Read first 1000 chars to detect structure
          });
          
          let sample = '';
          for await (const chunk of sampleStream) {
            sample += chunk;
          }
          
          logger.debug(`File sample: ${sample.substring(0, 100)}...`);
          
          // Full read for the actual processing
          const fileContent = await fsPromises.readFile(filePath, 'utf8');
          logger.info(`Read complete file, size: ${(fileContent.length / (1024 * 1024)).toFixed(2)} MB`);
          
          let data;
          try {
            data = JSON.parse(fileContent);
            logger.success(`Successfully parsed JSON`);
          } catch (err) {
            logger.error(`Failed to parse JSON`, err);
            throw err;
          }
          
          // Check structure and process listings
          if (data && typeof data === 'object') {
            let listings = [];
            
            // Try to find listings in common structures
            if (data.newListings && typeof data.newListings === 'object') {
              logger.info(`Found newListings object with ${Object.keys(data.newListings).length} entries`);
              
              // Convert the newListings object to an array of listings with IDs
              listings = Object.entries(data.newListings).map(([id, listing]) => ({
                ...(listing as any),
                id
              }));
            } else if (Array.isArray(data)) {
              logger.info(`Found array of ${data.length} entries`);
              listings = data.map((item, index) => ({
                ...item,
                id: item.id || String(index)
              }));
            } else if (Object.keys(data).length > 0) {
              // Assume top-level object with listing IDs as keys
              logger.info(`Found object with ${Object.keys(data).length} keys`);
              listings = Object.entries(data).map(([id, listing]) => ({
                ...(listing as any),
                id
              }));
            }
            
            // Look for URL fields with different possible names
            const getListingUrl = (listing: any): string | undefined => {
              // Check common URL field names
              const urlFields = ['listingUrl', 'url', 'link', 'href', 'listing_url', 'property_url'];
              
              for (const field of urlFields) {
                if (listing[field] && typeof listing[field] === 'string') {
                  return listing[field];
                }
              }
              
              // Look for any field that might contain a URL
              for (const [key, value] of Object.entries(listing)) {
                if (
                  typeof value === 'string' && 
                  (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) &&
                  (value.startsWith('http://') || value.startsWith('https://'))
                ) {
                  return value;
                }
              }
              
              return undefined;
            };
            
            // Add URL diagnostics
            logger.info(`Checking URL fields in listings...`);
            const urlFieldCounts: Record<string, number> = {};
            listings.forEach(listing => {
              Object.keys(listing).forEach(key => {
                if (
                  typeof listing[key] === 'string' && 
                  (
                    key.toLowerCase().includes('url') || 
                    key.toLowerCase().includes('link') ||
                    (listing[key].startsWith('http://') || listing[key].startsWith('https://'))
                  )
                ) {
                  urlFieldCounts[key] = (urlFieldCounts[key] || 0) + 1;
                }
              });
            });
            
            logger.info(`URL field names found:`, urlFieldCounts);
            
            // Filter for listings with URLs (using flexible URL detection)
            const validListings = listings.filter(l => getListingUrl(l));
            logger.info(`Found ${validListings.length} listings with URLs out of ${listings.length} total entries`);
            
            // Process each valid listing
            for (const listing of validListings) {
              const url = getListingUrl(listing);
              if (url) {
                await callback({
                  ...listing,
                  url, // Ensure the url field is set for consistency
                } as T);
              }
            }
            
            logger.success(`Completed processing ${validListings.length} listings`);
            resolve();
          } else {
            logger.error(`Unexpected data structure: ${typeof data}`);
            reject(new Error(`Unexpected data structure: ${typeof data}`));
          }
        } catch (err) {
          logger.error(`Error reading or processing file`, err);
          reject(err);
        }
      })
      .catch(err => {
        logger.error(`File access error for ${filePath}`, err);
        reject(err);
      });
  });
};

// Update listing with new data
export const updateListingData = async (
  id: string,
  extractedData: ExtractedData
): Promise<void> => {
  logger.debug(`Updating data for listing ${id}`);
  try {
    // Update all-listings.json with the extracted data
    const allListingsPath = path.join(process.cwd(), "all-listings.json");
    // Check if all-listings.json exists
    try {
      await fsPromises.access(allListingsPath);
      logger.debug(`all-listings.json exists`);
    } catch {
      logger.warning(`all-listings.json not found, will be created when needed`);
      return; // Exit early if all-listings.json doesn't exist yet
    }
    
    // Read the current all-listings.json
    const allListingsData = await fsPromises.readFile(allListingsPath, "utf8");
    let allListings;
    
    try {
      allListings = JSON.parse(allListingsData);
    } catch (parseError) {
      logger.error(`Failed to parse all-listings.json, skipping update`, parseError);
      return;
    }
    
    // Make sure newListings exists
    if (!allListings.newListings) {
      allListings.newListings = {};
    }
    
    // Only update if listing exists, don't create new entries
    if (allListings.newListings[id]) {
      // Merge in the extracted data
      allListings.newListings[id] = {
        ...allListings.newListings[id],
        ...extractedData,
        lastUpdated: new Date().toISOString()
      };
      
      // Write back to all-listings.json
      await fsPromises.writeFile(allListingsPath, JSON.stringify(allListings, null, 2));
      logger.success(`Updated listing ${id} in all-listings.json`);
    } else {
      logger.warning(`Listing ${id} not found in all-listings.json, skipping update`);
    }
  } catch (error) {
    logger.error(`Failed to update listing ${id}`, error);
  }
};

/**
 * Batch processing fallback function when queue is not available
 */
const processBatchJob = async (
  inputFilePath: string,
  extractors: Extractor[],
  batchSize: number
): Promise<void> => {
  let browser: Browser | null = null;
  const pipeline = combineExtractors(...extractors);
  let processedCount = 0;
  let batch: Listing[] = [];
  
  try {
    // Initialize browser
    logger.info("Initializing browser for batch processing");
    const browserResult = await initBrowser()();
    if (browserResult._tag === 'Left') {
      logger.error("Browser initialization failed", browserResult.left);
      throw browserResult.left;
    }
    browser = browserResult.right;
    logger.success("Browser initialized successfully");
    
    // Process listings in batches
    await streamJsonFile<Listing>(inputFilePath, async (listing) => {
      if (!listing.url) {
        logger.warning(`Skipping listing ${listing.id} with no URL`);
        return;
      }
      
      batch.push(listing);
      
      if (batch.length >= batchSize) {
        await processBatchListing(batch, browser as Browser, pipeline);
        batch = [];
        processedCount += batchSize;
      }
    });
    
    if (batch.length > 0 && browser) {
      await processBatchListing(batch, browser, pipeline);
      processedCount += batch.length;
    }
    
    logger.success(`Batch processing completed. Total processed: ${processedCount} listings`);
  } catch (error) {
    logger.error("Batch processing failed", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Process a batch of listings with a single browser instance
 */
const processBatchListing = async (
  batch: Listing[],
  browser: Browser,
  pipeline: ExtractorPipeline
): Promise<void> => {
  logger.info(`Processing batch of ${batch.length} listings in parallel`);
  
  // Map batch to IDs for better logging
  const batchIds = batch.map(l => l.id).join(', ');
  logger.debug(`Batch contains listings: ${batchIds}`);
  
  const promises = batch.map(async (listing) => {
    // URL should be already validated and standardized
    const url = listing.url;
    if (!url) {
      logger.warning(`Skipping listing ${listing.id} with no URL in batch processing`);
      return;
    }
    
    logger.info(`Starting to process listing ${listing.id}: ${url}`);
    
    try {
      const result = await processListing(url, pipeline, listing.id)(browser)();
      
      if (result._tag === 'Right') {
        const data = result.right;
        
        // Handle removed listings
        if (data.isRemoved) {
          logger.success(`Listing ${listing.id} was detected as removed and has been removed from database`);
          return;
        }
        
        logger.success(`Successfully extracted data for listing ${listing.id}`);
        logger.debug(`Extracted data summary for ${listing.id}:`, {
          hasTags: !!data.tags,
          tagCount: data.tags?.length || 0,
          hasLatLong: !!data.latLong,
          hasLatLongString: !!data.latLongString
        });
        
        await updateListingData(listing.id, data);
        
        // Only remove from failed jobs if tags were successfully extracted and non-empty
        if (data.tags && data.tags.length > 0) {
          await removeFailedJob(listing.id);
          logger.success(`Listing ${listing.id} removed from failed jobs after successful tag extraction`);
        } else {
          logger.warning(`Listing ${listing.id} processed but no tags found, keeping in failed jobs`);
          await addFailedJob(
            listing.id,
            url,
            "No tags extracted from listing"
          );
        }
      } else {
        logger.error(`Failed to process listing ${listing.id}`, result.left);
        // Track failure but continue with other listings
        await addFailedJob(
          listing.id,
          url,
          result.left instanceof Error ? result.left.message : String(result.left)
        );
      }
    } catch (error) {
      logger.error(`Unexpected error processing listing ${listing.id}`, error);
      // Track unexpected failures
      await addFailedJob(
        listing.id,
        url,
        error instanceof Error ? error.message : String(error)
      );
    }
  });
  
  await Promise.all(promises);
  logger.success(`Completed processing batch of ${batch.length} listings`);
};

// Main job function
export const processListingsJob = async (
  inputFilePath: string = path.join(process.cwd(), "all-listings.json"),
  // Only use checkIfListingExists and extractAndTranslateTags
  extractors: Extractor[] = [checkIfListingExists, extractAndTranslateTags],
  batchSize: number = 5
): Promise<void> => {
  logger.info(`Starting processing job from ${inputFilePath}`);
  logger.info(`Using extractors: ${extractors.length}`);
  
  // Create a map of extractors to consistent ID strings
  const extractorMap: Record<string, Extractor> = {
    'checkIfListingExists': checkIfListingExists,
    'extractLatLongAsString': extractLatLongAsString,
    'extractAndTranslateTags': extractAndTranslateTags,
    'extractDescription': extractDescription
  };
  
  // Get extractor IDs instead of trying to use function.name
  const getExtractorId = (extractor: Extractor): string => {
    for (const [id, fn] of Object.entries(extractorMap)) {
      if (fn === extractor) {
        return id;
      }
    }
    return 'unknown';
  };
  
  // Log which extractors are being used with reliable IDs
  const extractorIds = extractors.map(getExtractorId).filter(id => id !== 'unknown');
  logger.info(`Active extractors: ${extractorIds.join(', ')}`);
  
  try {
    // Check if queue is available
    if (!scrapingQueue) {
      logger.error("Queue not initialized, falling back to batch processing");
      return processBatchJob(inputFilePath, extractors, batchSize);
    }

    const queue = scrapingQueue; // Create a non-null reference
    
    // Process listings using the queue
    logger.info(`Starting to stream listings from ${inputFilePath}`);
    let queuedCount = 0;
    
    await streamJsonFile<Listing>(inputFilePath, async (listing) => {
      // URL was already validated and standardized in streamJsonFile
      if (!listing.url) {
        logger.warning(`Skipping listing ${listing.id} with no URL`);
        return;
      }
      
      try {
        // Add job to queue with retry options
        const job = await queue.add('scrape-listing', {
          id: listing.id,
          url: listing.url,
          extractors: extractorIds // Use consistent extractor IDs
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
        
        logger.debug(`Added job to queue for listing ${listing.id}`);
        queuedCount++;
      } catch (error) {
        logger.error(`Error adding job to queue for listing ${listing.id}`, error);
      }
    });
    
    logger.success(`Successfully processed ${queuedCount} listings`);
  } catch (error) {
    logger.error(`Error processing listings job:`, error);
  }
};