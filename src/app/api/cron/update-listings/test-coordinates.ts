/**
 * Test script for coordinate extraction
 * 
 * This standalone script tests our coordinate extraction function on a sample URL.
 */

import puppeteer from 'puppeteer';

async function extractCoordinates(
  page: any,
  url: string,
  retries: number = 3
): Promise<{ lat: number | null; long: number | null }> {
  console.log(`[DEBUG] Attempting to extract coordinates from ${url}`);

  try {
    // Enable verbose browser console logging
    page.on('console', (msg: any) => console.log(`[Browser Console] ${msg.text()}`));
    page.on('pageerror', (error: Error) => console.error(`[Browser PageError] ${error.message}`));
    page.on('error', (error: Error) => console.error(`[Browser Error] ${error.message}`));
    
    // Navigate to the URL with a timeout to handle slow sites
    console.log(`[DEBUG] Navigating to ${url} with timeout of 30000ms`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      .catch((error: Error) => {
        console.error(`[DEBUG] Navigation error: ${error.message}`);
        // Continue execution even if navigation times out
      });
    
    console.log(`[DEBUG] Page loaded. Waiting for scripts to initialize...`);
    
    // Wait a bit to ensure JS has loaded
    await page.waitForTimeout(3000);

    // Try multiple times to account for slow-loading JavaScript
    for (let attempt = 1; attempt <= retries; attempt++) {
      console.log(`[DEBUG] Starting extraction attempt ${attempt} of ${retries}`);

      if (attempt > 1) {
        // Wait longer for subsequent attempts
        console.log(`[DEBUG] Waiting additional time for attempt ${attempt}`);
        await page.waitForTimeout(3000);
      }

      // Execute browser context script to extract coordinates
      const coordinates = await page.evaluate(() => {
        function debugLog(message: string) {
          console.log(`[DEBUG-BROWSER] ${message}`);
        }

        try {
          debugLog('Starting coordinate extraction in browser context');
          
          // Method 1: Look for coordinates in the page's HTML source code
          debugLog('Checking entire page source for coordinate patterns');
          const pageSource = document.documentElement.outerHTML;
          
          // Common coordinate patterns in Japanese real estate sites
          const patterns = [
            // Pattern for "lat=XX.XXX&lng=YY.YYY"
            /lat=(-?\d+\.\d+)&.*?lng=(-?\d+\.\d+)/i,
            // Pattern for "latitude=XX.XXX&longitude=YY.YYY"
            /latitude=(-?\d+\.\d+)&.*?longitude=(-?\d+\.\d+)/i,
            // Pattern for coordinates in quotes "XX.XXX,YY.YYY"
            /"(-?\d+\.\d+),(-?\d+\.\d+)"/,
            // Pattern for coordinates in parameter format "lat: XX.XXX, lng: YY.YYY"
            /lat:\s*(-?\d+\.\d+),\s*lng:\s*(-?\d+\.\d+)/i,
            // Pattern for comma-separated coords in Japanese format
            /[座標|緯度経度|位置情報].*?(-?\d+\.\d+),\s*(-?\d+\.\d+)/
          ];
          
          for (const pattern of patterns) {
            const match = pageSource.match(pattern);
            if (match && match[1] && match[2]) {
              debugLog(`Found coordinates in HTML: ${match[1]}, ${match[2]}`);
              return { 
                lat: parseFloat(match[1]), 
                long: parseFloat(match[2]) 
              };
            }
          }
          
          // Method 2: Look for Google Maps iframes
          debugLog('Checking for Google Maps iframes');
          const iframes = document.querySelectorAll('iframe');
          debugLog(`Found ${iframes.length} iframes`);
          
          for (const iframe of iframes) {
            const src = iframe.getAttribute('src') || '';
            debugLog(`Checking iframe src: ${src}`);
            
            if (src.includes('maps.google.com') || src.includes('google.com/maps')) {
              debugLog(`Found Google Maps iframe: ${src}`);
              
              // Extract coordinates from q parameter
              const qMatch = src.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (qMatch && qMatch[1] && qMatch[2]) {
                debugLog(`Extracted coordinates from q parameter: ${qMatch[1]}, ${qMatch[2]}`);
                return {
                  lat: parseFloat(qMatch[1]),
                  long: parseFloat(qMatch[2])
                };
              }
              
              // Extract from center parameter
              const centerMatch = src.match(/[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (centerMatch && centerMatch[1] && centerMatch[2]) {
                debugLog(`Extracted coordinates from center parameter: ${centerMatch[1]}, ${centerMatch[2]}`);
                return {
                  lat: parseFloat(centerMatch[1]),
                  long: parseFloat(centerMatch[2])
                };
              }
              
              // Look for other coordinate patterns in the iframe src
              const llMatch = src.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (llMatch && llMatch[1] && llMatch[2]) {
                debugLog(`Extracted coordinates from ll parameter: ${llMatch[1]}, ${llMatch[2]}`);
                return {
                  lat: parseFloat(llMatch[1]), 
                  long: parseFloat(llMatch[2])
                };
              }
            }
          }
          
          // Method 3: Check for coordinates in script tags
          debugLog('Checking script tags for coordinate variables');
          const scripts = document.querySelectorAll('script');
          debugLog(`Found ${scripts.length} script elements`);
          
          // Print first few script contents for debugging
          for (let i = 0; i < Math.min(3, scripts.length); i++) {
            const scriptContent = scripts[i].textContent || '';
            debugLog(`Script ${i} snippet (first 100 chars): ${scriptContent.substring(0, 100)}`);
          }
          
          for (const script of scripts) {
            const content = script.textContent || '';
            
            // Check for common coordinate patterns in script content
            if (content.includes('google.maps') || 
                content.includes('lat') || 
                content.includes('lng') || 
                content.includes('coordinates')) {
              debugLog('Found script with potential coordinate-related content');
            }
            
            // Check for pair of latitude and longitude variables
            const latMatch = content.match(/var\s+lat\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i) || 
                          content.match(/var\s+latitude\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i) ||
                          content.match(/var\s+bukken_lat\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i);
            
            const lngMatch = content.match(/var\s+lon(?:g)?\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i) ||
                          content.match(/var\s+longitude\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i) ||
                          content.match(/var\s+bukken_lng\s*=\s*['"]*(-?\d+\.\d+)['"]*\s*;/i);
            
            if (latMatch && latMatch[1] && lngMatch && lngMatch[1]) {
              debugLog(`Found lat/lng variables in script: ${latMatch[1]}, ${lngMatch[1]}`);
              return {
                lat: parseFloat(latMatch[1]),
                long: parseFloat(lngMatch[1])
              };
            }
            
            // Look for JSON-like coordinate objects
            const jsonCoordMatch = content.match(/[{\s,](?:["'])?(?:lat|latitude)(?:["'])?\s*:\s*(-?\d+\.\d+)[,\s}].*?[{\s,](?:["'])?(?:lng|long|longitude)(?:["'])?\s*:\s*(-?\d+\.\d+)[,\s}]/i);
            if (jsonCoordMatch && jsonCoordMatch[1] && jsonCoordMatch[2]) {
              debugLog(`Found JSON-like coordinates in script: ${jsonCoordMatch[1]}, ${jsonCoordMatch[2]}`);
              return {
                lat: parseFloat(jsonCoordMatch[1]),
                long: parseFloat(jsonCoordMatch[2])
              };
            }
            
            // Look for LatLng constructor
            const latlngMatch = content.match(/new\s+google\.maps\.LatLng\s*\(\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)/i);
            if (latlngMatch && latlngMatch[1] && latlngMatch[2]) {
              debugLog(`Found LatLng constructor: ${latlngMatch[1]}, ${latlngMatch[2]}`);
              return {
                lat: parseFloat(latlngMatch[1]),
                long: parseFloat(latlngMatch[2])
              };
            }
          }
          
          // No coordinates found after all methods
          debugLog('No coordinates found after trying all methods');
          return {
            lat: null,
            long: null
          };
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
      if (coordinates.lat !== null && coordinates.long !== null) {
        console.log(`[DEBUG] Found valid coordinates on attempt ${attempt}: ${coordinates.lat}, ${coordinates.long}`);
        return coordinates;
      }
      
      console.log(`[DEBUG] No valid coordinates found on attempt ${attempt}, ${attempt < retries ? 'retrying...' : 'all attempts exhausted'}`);
    }

    // Return null coordinates if we couldn't find any after all retries
    console.log(`[DEBUG] Could not extract coordinates after ${retries} attempts`);
    return { lat: null, long: null };
  } catch (error) {
    console.error(`[DEBUG] Uncaught error in extractCoordinates:`, error);
    return { lat: null, long: null };
  }
}

async function testCoordinateExtraction() {
  console.log('Starting coordinate extraction test...');
  
  // Set up browser with non-headless mode for easier debugging
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production use
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test URLs - add your test URLs here
    const testUrls = [
      'https://www.shiawasehome-reuse.com/niigata-shi/kita-ku/niigatashikitakumatuhama4A.z'
    ];
    
    for (const url of testUrls) {
      console.log(`\n\n[TEST] Testing URL: ${url}`);
      const coordinates = await extractCoordinates(page, url);
      
      if (coordinates.lat !== null && coordinates.long !== null) {
        console.log(`✅ SUCCESS: Found coordinates: ${coordinates.lat}, ${coordinates.long}`);
      } else {
        console.log('❌ FAILED: Could not extract coordinates from this URL');
      }
    }
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCoordinateExtraction()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 