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
  console.log(`Attempting to extract coordinates from ${url}`);
  
  // Navigate to the URL
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Try multiple times to account for slow-loading JavaScript
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Attempt ${attempt} of ${retries}`);
    
    if (attempt > 1) {
      // Wait a bit longer for subsequent attempts
      await page.waitForTimeout(2000);
    }
    
    // Execute browser context script to extract coordinates
    const coordinates = await page.evaluate(() => {
      try {
        // Method 1: Look for iframe.detail-googlemap (primary method from latitude-longitude.ts)
        const mapIframe = document.querySelector('iframe.detail-googlemap');
        if (mapIframe) {
          const src = mapIframe.getAttribute('src') || '';
          const coordMatch = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (coordMatch && coordMatch[1] && coordMatch[2]) {
            console.log(`Found coordinates in detail-googlemap: ${coordMatch[1]},${coordMatch[2]}`);
            return {
              lat: parseFloat(coordMatch[1]),
              long: parseFloat(coordMatch[2])
            };
          }
        }
        
        // Method 2: Look for map_canvas which contains Google Maps data
        const mapCanvas = document.querySelector('#map_canvas');
        if (mapCanvas) {
          // Try to find coordinates in inline scripts
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const content = script.textContent || '';
            // Look for JavaScript code that might set map coordinates
            const latMatch = content.match(/var\s+bukken_lat\s*=\s*["']?(-?\d+\.\d+)["']?/);
            const lngMatch = content.match(/var\s+bukken_lng\s*=\s*["']?(-?\d+\.\d+)["']?/);
            
            if (latMatch && lngMatch) {
              console.log(`Found coordinates in script variables: ${latMatch[1]},${lngMatch[1]}`);
              return {
                lat: parseFloat(latMatch[1]),
                long: parseFloat(lngMatch[1])
              };
            }
          }
          
          // Alternative: Check if coordinates are in an attribute or data attribute
          const dataLatLng = mapCanvas.getAttribute('data-latlng') || 
                            mapCanvas.getAttribute('data-coordinates') || 
                            '';
          
          if (dataLatLng) {
            const parts = dataLatLng.split(',');
            if (parts.length === 2) {
              console.log(`Found coordinates in data attribute: ${parts[0]},${parts[1]}`);
              return {
                lat: parseFloat(parts[0].trim()),
                long: parseFloat(parts[1].trim())
              };
            }
          }
        }
        
        // Method 3: Look for any Google Maps iframe (fallback)
        const anyMapIframe = document.querySelector('iframe[src*="maps.google"]');
        if (anyMapIframe) {
          const src = anyMapIframe.getAttribute('src') || '';
          const match = src.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/) || 
                       src.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
          
          if (match) {
            console.log(`Found coordinates in generic maps iframe: ${match[1]},${match[2]}`);
            return {
              lat: parseFloat(match[1]),
              long: parseFloat(match[2])
            };
          }
        }
        
        // Method 4: Look for specific variables in script tags
        const allScripts = document.querySelectorAll('script');
        for (const script of allScripts) {
          const content = script.textContent || '';
          
          // Look for various patterns of coordinate declarations
          const patterns: CoordinatePattern[] = [
            // Common variable patterns
            { lat: /var\s+lat\s*=\s*["']?(-?\d+\.\d+)["']?/, lng: /var\s+lng\s*=\s*["']?(-?\d+\.\d+)["']?/ },
            { lat: /var\s+latitude\s*=\s*["']?(-?\d+\.\d+)["']?/, lng: /var\s+longitude\s*=\s*["']?(-?\d+\.\d+)["']?/ },
            // JSON object patterns
            { lat: /"lat(?:itude)?"\s*:\s*(-?\d+\.\d+)/, lng: /"(?:lng|long|longitude)"\s*:\s*(-?\d+\.\d+)/ },
            // Japanese specific patterns
            { lat: /var\s+ju\s*=\s*["']([0-9]+\.[0-9]+),([0-9]+\.[0-9]+)["']/ }
          ];
          
          for (const pattern of patterns) {
            if ('lng' in pattern) {
              const latMatch = content.match(pattern.lat);
              const lngMatch = content.match(pattern.lng as RegExp);
              
              if (latMatch && lngMatch) {
                return {
                  lat: parseFloat(latMatch[1]),
                  long: parseFloat(lngMatch[1])
                };
              }
            } else {
              // Handle special case like ju variable which contains both lat,lng
              const match = content.match(pattern.lat);
              if (match && match[1] && match[2]) {
                return {
                  lat: parseFloat(match[1]),
                  long: parseFloat(match[2])
                };
              }
            }
          }
        }
        
        // Method 5: Check for meta tags with geo information
        const geoPosition = document.querySelector('meta[name="geo.position"]');
        if (geoPosition) {
          const content = geoPosition.getAttribute('content');
          if (content && content.includes(';')) {
            const [lat, long] = content.split(';').map(c => parseFloat(c.trim()));
            console.log(`Found coordinates in meta tag: ${lat}, ${long}`);
            return {
              lat,
              long
            };
          }
        }
        
        // No coordinates found
        return {
          lat: null,
          long: null
        };
      } catch (e) {
        console.error('Error extracting coordinates:', e);
        return {
          lat: null,
          long: null
        };
      }
    });
    
    // If we found coordinates, return them
    if (coordinates.lat !== null && coordinates.long !== null) {
      return coordinates;
    }
  }
  
  // Return null coordinates if we couldn't find any after all retries
  return { lat: null, long: null };
}

/**
 * Main function to process properties with missing coordinates
 */
async function fixMissingCoordinates() {
  console.log('Starting fix-missing-coordinates script...');
  
  try {
    // Read the batch_test_results.json file
    const fileContent = await fs.readFile(BATCH_RESULTS_PATH, 'utf8');
    const batchResults: BatchTestResults = JSON.parse(fileContent);
    
    // Filter properties with missing coordinates
    const propertiesWithMissingCoordinates: [string, Property][] = Object.entries(batchResults)
      .filter(([_, property]) => {
        // Check if coordinates are missing or null
        return (
          !property.coordinates || 
          property.coordinates.lat === null || 
          property.coordinates.long === null
        );
      });
    
    console.log(`Found ${propertiesWithMissingCoordinates.length} properties with missing coordinates`);
    
    // Exit if no properties need fixing
    if (propertiesWithMissingCoordinates.length === 0) {
      console.log('No properties need coordinate fixing. Exiting.');
      return;
    }
    
    // Launch a browser instance
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
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
          batchResults[address].coordinates = coordinates;
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
    
    // Write the updated data back to the file
    await fs.writeFile(BATCH_RESULTS_PATH, JSON.stringify(batchResults, null, 2), 'utf8');
    
    console.log(`Completed processing. Updated coordinates for ${successCount} out of ${propertiesWithMissingCoordinates.length} properties.`);
  } catch (error) {
    console.error('Error in fixMissingCoordinates:', error);
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  fixMissingCoordinates()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed with error:', error);
      process.exit(1);
    });
}

// Export the function for use in other files
module.exports = { fixMissingCoordinates }; 