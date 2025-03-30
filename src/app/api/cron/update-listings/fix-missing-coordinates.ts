/**
 * Fix Missing Coordinates Script
 * 
 * This script reads properties from batch_test_results.json, identifies properties with missing
 * latitude/longitude coordinates, visits each property's URL, attempts to extract the coordinates,
 * and updates the file with the new data.
 */

// Use dynamic import for fs and path to work with either module system
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

// Define the path to the batch_test_results.json file
const BATCH_RESULTS_PATH = path.join(process.cwd(), 'public', 'batch_test_results.json');

// Define the property type that matches our data structure
interface Property {
  tags: string;
  listingDetail: string;
  price: number;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingDetailUrl: string;
  buildDate: string;
  isSold: boolean;
  original: {
    address: string;
    tags: string;
    listingDetail: string;
    price: string;
    layout: string;
    buildDate: string;
    aboutProperty?: string;
    facilities?: {
      water: string | null;
      gas: string | null;
      sewage: string | null;
      greyWater: string | null;
    };
    schools?: {
      primary: string | null;
      juniorHigh: string | null;
    };
  };
  coordinates?: {
    lat: number | null;
    long: number | null;
  };
}

// Define the batch_test_results structure
interface BatchTestResults {
  [address: string]: Property;
}

// Interface for pattern matching
interface CoordinatePattern {
  lat: RegExp;
  lng?: RegExp;
}

// Define a type for the result from extractLatLongAsString
interface ExtractedData {
  latLong?: {
    lat: number;
    long: number;
  };
  latLongString?: string;
}

const extractLatLongAsString = (page: any) =>
  TE.tryCatch(
    async () => {
      const url = page.url();
      
      // Define logger with all required methods
      const logger = {
        info: (msg: string) => console.log(`[INFO] ${msg}`),
        success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
        warn: (msg: string) => console.warn(`[WARN] ${msg}`),
        warning: (msg: string) => console.warn(`[WARN] ${msg}`), // Alias for warn for backwards compatibility
        error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
        debug: (msg: string) => console.log(`[DEBUG] ${msg}`)
      };
      
      logger.info(`Extracting latitude/longitude from ${url}`);

      // Define retry parameters
      const maxRetries = 2;
      const retryDelay = 500;

      let latLongData = null;
      let isInterceptionEnabled = false;

      // Store potential coordinate data from network requests
      const coordinatesFromRequests: Array<{ lat: number, long: number, source: string }> = [];

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
            console.error(`[DEBUG] Error parsing network response:`, error);
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

async function extractJsCoordinates() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.shiawasehome-reuse.com/niigata-shi/kita-ku/niigatashikitakumatuhama4A.z');

  // Method 1: Extract from Google Maps iframe src attribute
  const mapsSrc = await page.evaluate(() => {
    const mapsIframe = document.querySelector('iframe[src*="maps.google.com/maps"]') as HTMLIFrameElement | null;
    return mapsIframe ? mapsIframe.src : null;
  });

  // Method 2: Extract coordinates from map initialization JavaScript
  const coordinates = await page.evaluate(() => {
    // Look for coordinates in the page's scripts
    return null;
  });

  // Method 3: Extract from any JavaScript variables containing coordinates
  const jsCoordinates = await page.evaluate(() => {
    // This regex looks for latitude/longitude patterns in the page source
    const pageText = document.documentElement.outerHTML;
    const matches = pageText.match(/([\d.]+),([\d.]+).*?[Ll]at|[Ll]atitude|[Ll]at[,:]|([\d.]+),([\d.]+).*?[Ll]ng|[Ll]ongitude|[Ll]ng[,:]/g);

    if (matches && matches.length > 0) {
      return matches;
    }

    return null;
  });

  await browser.close();
  return { mapsSrc, coordinates, jsCoordinates };
}

/**
 * Extracts coordinates from a webpage using multiple methods
 * @param page Puppeteer page object
 * @param url URL of the property listing
 * @param retries Number of retry attempts
 * @returns Coordinates object with latitude and longitude
 */
async function extractCoordinates(
  page: any,
  url: string,
  retries: number = 3
): Promise<{ lat: number | null; long: number | null }> {
  console.log(`[DEBUG] Attempting to extract coordinates from ${url}`);

  try {
    // Enable verbose browser console logging
    // page.on('console', (msg: any) => console.log(`[Browser Console] ${msg.text()}`));
    // page.on('pageerror', (error: Error) => console.error(`[Browser PageError] ${error.message}`));
    // page.on('error', (error: Error) => console.error(`[Browser Error] ${error.message}`));

    // Navigate to the URL with a timeout to handle slow sites
    console.log(`[DEBUG] Navigating to ${url} with timeout of 30000ms`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      .catch((error: Error) => {
        console.error(`[DEBUG] Navigation error: ${error.message}`);
        // Continue execution even if navigation times out
      });

    console.log(`[DEBUG] Page loaded. Waiting for scripts to initialize...`);

    // Wait a bit to ensure JS has loaded
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Use the extractLatLongAsString function for coordinate extraction
    console.log(`[DEBUG] Using extractLatLongAsString function to find coordinates`);

    try {
      // Run the extractor and handle the result directly
      const extractorResult = await extractLatLongAsString(page)();

      if (extractorResult._tag === 'Right') {
        // Successfully extracted coordinates
        const result = extractorResult.right;
        if (result.latLong && result.latLong.lat && result.latLong.long) {
          console.log(`[DEBUG] Successfully extracted coordinates: ${result.latLongString}`);
          return {
            lat: result.latLong.lat,
            long: result.latLong.long
          };
        }
      } else {
        // Extraction failed, log the error
        console.error(`[DEBUG] Error in extractLatLongAsString:`, extractorResult.left);
      }
    } catch (error) {
      console.error(`[DEBUG] Exception during extractLatLongAsString:`, error);
    }

    // If extractLatLongAsString didn't find coordinates, attempt fallback methods
    console.log(`[DEBUG] extractLatLongAsString could not find coordinates, attempting fallback methods`);

    // Try multiple times to account for slow-loading JavaScript
    for (let attempt = 1; attempt <= retries; attempt++) {
      console.log(`[DEBUG] Starting fallback extraction attempt ${attempt} of ${retries}`);

      if (attempt > 1) {
        // Wait longer for subsequent attempts
        console.log(`[DEBUG] Waiting additional time for attempt ${attempt}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Execute browser context script to extract coordinates
      const coordinates = await page.evaluate(() => {
        function debugLog(message: string) {
          console.log(`[DEBUG-BROWSER] ${message}`);
        }

        try {
          function extractMapCoordinates() {
            // Method 1: Look for the specific variable declarations in script tags
            const scriptTags = document.querySelectorAll('script');

            for (const script of scriptTags) {
              if (script.textContent) {
                // Use regex to find lat and lng variables
                const latMatch = script.textContent.match(/var\s+mlat\s*=\s*([\d\.]+)/);
                const lngMatch = script.textContent.match(/var\s+mlng\s*=\s*([\d\.]+)/);

                if (latMatch && lngMatch) {
                  return {
                    lat: parseFloat(latMatch[1]),
                    long: parseFloat(lngMatch[1]),
                    method: 'script variables'
                  };
                }
              }
            }

            // Method 2: Alternative approach - check if the map object is available in window
            // Use any type to safely access potentially undefined window properties
            const win = window as any;
            if (win.fudo_map_elevation && win.mlat && win.mlng) {
              return {
                lat: win.mlat,
                long: win.mlng,
                method: 'global variables'
              };
            }

            // Method 3: Look for coordinates in data attributes or other elements
            const mapCanvas = document.querySelector('.map_canvas');
            if (mapCanvas) {
              const dataLat = mapCanvas.getAttribute('data-lat');
              const dataLng = mapCanvas.getAttribute('data-lng');

              if (dataLat && dataLng) {
                return {
                  lat: parseFloat(dataLat),
                  long: parseFloat(dataLng),
                  method: 'data attributes'
                };
              }
            }

            // Method 4: Look for coordinates in the Google Maps URL if present
            const mapLinks = document.querySelectorAll('a[href*="maps.google.com"]');
            for (const link of mapLinks) {
              const href = link.getAttribute('href');
              if (href) {
                const llMatch = href.match(/ll=([\d\.]+),([\d\.]+)/);

                if (llMatch) {
                  return {
                    lat: parseFloat(llMatch[1]),
                    long: parseFloat(llMatch[2]),
                    method: 'google maps link'
                  };
                }
              }
            }

            return null; // Could not find coordinates
          }

          return extractMapCoordinates();
        } catch (error) {
          console.error('Error extracting coordinates:', error);
          return {
            lat: null,
            long: null
          };
        }
      });

      console.log(`[DEBUG] Extraction attempt ${attempt} results:`, JSON.stringify(coordinates));

      // If we found coordinates, return them
      if (coordinates && coordinates.lat !== null && coordinates.long !== null) {
        console.log(`[DEBUG] Found valid coordinates on attempt ${attempt}: ${coordinates.lat}, ${coordinates.long}`);
        return coordinates;
      }

      console.log(`[DEBUG] No valid coordinates found on attempt ${attempt}, ${attempt < retries ? 'retrying...' : 'all attempts exhausted'}`);
    }

    // If we reached here, all extraction attempts failed
    console.log(`[DEBUG] Could not extract coordinates after ${retries} attempts. Saving debug information...`);

    if (process.env.NODE_ENV === 'development') {
      // Create debug directory if it doesn't exist
      const debugDir = path.join(process.cwd(), 'public', 'debug');
      await fs.mkdir(debugDir, { recursive: true }).catch((err: Error) =>
        console.error(`[DEBUG] Error creating debug directory: ${err.message}`)
      );

      // Generate a unique filename based on URL and timestamp
      const timestamp = Date.now();
      const urlSafeId = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const filePrefix = `${urlSafeId}_${timestamp}`;

      // Take a screenshot
      const screenshotPath = path.join(debugDir, `${filePrefix}_screenshot.png`);
      await page.screenshot({ path: screenshotPath })
        .then(() => console.log(`[DEBUG] Screenshot saved to ${screenshotPath}`))
        .catch((err: Error) => console.error(`[DEBUG] Failed to save screenshot: ${err.message}`));

      // Save the full HTML content
      const htmlContent = await page.content();
      const htmlPath = path.join(debugDir, `${filePrefix}_page.html`);
      await fs.writeFile(htmlPath, htmlContent)
        .then(() => console.log(`[DEBUG] HTML content saved to ${htmlPath}`))
        .catch((err: Error) => console.error(`[DEBUG] Failed to save HTML content: ${err.message}`));

      // Save additional page information
      try {
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            metaTags: Array.from(document.querySelectorAll('meta')).map(meta => ({
              name: meta.getAttribute('name') || meta.getAttribute('property') || '',
              content: meta.getAttribute('content') || ''
            })),
            scriptSources: Array.from(document.querySelectorAll('script[src]')).map(script =>
              script.getAttribute('src')
            ),
            iframeCount: document.querySelectorAll('iframe').length,
            mapElements: {
              googleMapsLinks: Array.from(document.querySelectorAll('a[href*="maps.google.com"]')).map(a => a.getAttribute('href')),
              mapCanvasElements: document.querySelectorAll('.map_canvas').length,
              iframesWithMaps: Array.from(document.querySelectorAll('iframe[src*="maps"]')).map(iframe =>
                iframe.getAttribute('src')
              )
            }
          };
        });

        const infoPath = path.join(debugDir, `${filePrefix}_info.json`);
        await fs.writeFile(infoPath, JSON.stringify(pageInfo, null, 2))
          .then(() => console.log(`[DEBUG] Page information saved to ${infoPath}`))
          .catch((err: Error) => console.error(`[DEBUG] Failed to save page information: ${err.message}`));
      } catch (error) {
        console.error(`[DEBUG] Error collecting additional page information: ${error instanceof Error ? error.message : String(error)}`);
      }

      return { lat: null, long: null };
    }
  }
  catch (error) {
    console.error(`[DEBUG] Uncaught error in extractCoordinates:`, error);
    return { lat: null, long: null };
  }
  
  // Final return statement to ensure all code paths return a value
  return { lat: null, long: null };
}


/**
 * Main function to process properties with missing coordinates
 */
export async function fixMissingCoordinates(listingData: Record<string, Property>) {
  console.log('Starting fix-missing-coordinates script...');
  console.log(`Processing ${Object.entries(listingData).length} listings`);

  try {
    // Filter properties with missing coordinates
    const propertiesWithMissingCoordinates: [string, Property][] = Object.entries(listingData)
      .filter(([_, property]) => {
        // Check if coordinates are missing or null
        return (
          !property.coordinates ||
          property.coordinates.lat === null ||
          property.coordinates.long === null
        );
      });

    // Exit if no properties need fixing
    if (propertiesWithMissingCoordinates.length === 0) {
      console.log('No properties need coordinate fixing. Exiting.');
      return listingData;
    }

    console.log(`Found ${propertiesWithMissingCoordinates.length} properties with missing coordinates`);

    // Launch a browser instance with chromium-min for serverless
    let browser;
    
    if (process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL) {
      // Running on AWS Lambda, Vercel, or similar serverless environment
      console.log('Running in serverless environment, using chromium-min');
      chromium.setHeadlessMode = true;
      chromium.setGraphicsMode = false;
      
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local development environment - need to specify Chrome executable path
      console.log('Running in local environment, using system Chrome');
      
      // Determine the Chrome executable path based on the OS
      let executablePath = '';
      
      if (process.platform === 'win32') {
        // Windows path
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (process.platform === 'darwin') {
        // macOS path
        executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else {
        // Linux path
        executablePath = '/usr/bin/google-chrome';
      }
      
      console.log(`Using Chrome at: ${executablePath}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath
      });
    }

    // Track the number of successful updates
    let successCount = 0;

    // Process each property
    for (const [address, property] of propertiesWithMissingCoordinates) {
      // Skip if no URL is available
      if (!property.listingDetailUrl) {
        console.log(`Skipping property with no URL: ${address}`);
        continue;
      }

      console.log(`Processing property: ${address}`);

      try {
        // Create a new page for each property
        const page = await browser.newPage();

        // Set a user agent to mimic a real browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Extract coordinates
        const coordinates = await extractCoordinates(page, property.listingDetailUrl, 3);

        // Close the page when done
        await page.close();

        // Update the property if coordinates were found
        if (coordinates.lat !== null && coordinates.long !== null) {
          console.log(`Successfully extracted coordinates for ${address}: ${coordinates.lat}, ${coordinates.long}`);

          // Update the property with the new coordinates
          listingData[address].coordinates = coordinates;
          successCount++;
        } else {
          console.log(`Failed to extract coordinates for ${address}`);
        }
      } catch (error) {
        console.error(`Error processing property ${address}:`, error);
      }
    }

    // Close the browser when done
    await browser.close();

    if (process.env.NODE_ENV === 'development') {
      // Write the updated data back to the file
      await fs.writeFile(BATCH_RESULTS_PATH, JSON.stringify(listingData, null, 2), 'utf8');
    }

    console.log(`Completed processing. Updated coordinates for ${successCount} out of ${propertiesWithMissingCoordinates.length} properties.`);
    return listingData;
  } catch (error) {
    console.error('Error in fixMissingCoordinates:', error);
    return listingData;
  } finally {
    return listingData;
  }
}

// Execute the main function if this file is run directly
// if (require.main === module) {
//   fixMissingCoordinates()
//     .then(() => {
//       console.log('Script completed successfully');
//       process.exit(0);
//     })
//     .catch(error => {
//       console.error('Script failed with error:', error);
//       process.exit(1);
//     });
// }
