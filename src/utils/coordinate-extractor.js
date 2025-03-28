/**
 * Utility functions for extracting coordinates from property listing pages
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Configuration object for coordinate extraction
 * @typedef {Object} ExtractorConfig
 * @property {boolean} [debug=false] - Whether to save debug information
 * @property {string} [debugDir='debug'] - Directory to save debug files
 * @property {boolean} [headless=true] - Whether to run browser in headless mode
 * @property {number} [timeout=60000] - Navigation timeout in milliseconds
 */

/**
 * Result object for coordinate extraction
 * @typedef {Object} CoordinateResult
 * @property {number|null} lat - Latitude value
 * @property {number|null} long - Longitude value
 * @property {string|null} source - Source of the coordinates
 */

/**
 * Extract coordinates from a URL
 * @param {string} url - The URL to extract coordinates from
 * @param {ExtractorConfig} [config] - Configuration options
 * @returns {Promise<CoordinateResult>} - Extracted coordinates
 */
async function extractCoordinatesFromUrl(url, config = {}) {
  const {
    debug = false,
    debugDir = 'debug',
    headless = true,
    timeout = 60000
  } = config;

  let browser = null;

  try {
    // Create debug directory if needed
    if (debug) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-features=site-per-process',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-logging',  // Disable browser logging
        '--disable-remote-fonts',
        '--window-size=1920,1080'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    // Create a new page
    const page = await browser.newPage();

    // Only set up logging in debug mode and only for errors
    if (debug) {
      // Collect logs instead of printing them immediately
      const logs = [];
      page.on('pageerror', error => logs.push(['error', error.message]));
      page.on('error', error => logs.push(['error', error.message]));
      
      // Only log console errors and warnings
      page.on('console', message => {
        const type = message.type();
        if (type === 'error' || type === 'warning') {
          logs.push([type, message.text()]);
        }
      });

      // Write logs at the end if needed
      process.on('exit', () => {
        if (logs.length > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          fs.writeFileSync(
            `${debugDir}/${timestamp}-browser-logs.json`,
            JSON.stringify(logs, null, 2)
          );
        }
      });
    }

    // Optimize page performance
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      // Block unnecessary resources
      if ([
        'image',
        'stylesheet',
        'font',
        'media',
        'other',
        'websocket',
        'manifest',
        'texttrack',
        'object',
        'beacon',
        'csp_report',
        'imageset',
      ].includes(resourceType) || 
        request.url().match(/\.(png|jpg|jpeg|gif|webp|css|woff|woff2|ttf|otf)$/) ||
        request.url().includes('facebook') ||
        request.url().includes('analytics') ||
        request.url().includes('tracking') ||
        request.url().includes('advertisement') ||
        request.url().includes('marketing') ||
        request.url().includes('doubleclick')
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set navigation timeout
    page.setDefaultNavigationTimeout(timeout);

    // Set up response interception for faster coordinate extraction
    let coordinatesFromResponse = null;
    const responseHandler = async response => {
      if (coordinatesFromResponse) return;

      const url = response.url();
      if (url.includes('maps.google.com') || url.includes('maps/api')) {
        try {
          const text = await response.text();
          const llMatch = text.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (llMatch) {
            coordinatesFromResponse = {
              lat: parseFloat(llMatch[1]),
              long: parseFloat(llMatch[2]),
              source: 'response-intercept'
            };
            // Remove handler once we find coordinates
            page.off('response', responseHandler);
          }
        } catch (e) {
          // Ignore response parsing errors
        }
      }
    };
    page.on('response', responseHandler);

    // Navigate to the URL with optimized settings
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Check if we found coordinates in responses
    if (coordinatesFromResponse) {
      return coordinatesFromResponse;
    }

    // Extract coordinates from the page with minimal logging
    const coordinates = await page.evaluate(() => {
      const findCoordinates = () => {
        // Check Google Maps links (most common)
        const mapLinks = document.querySelectorAll('a[href*="maps.google.com"]');
        for (const link of mapLinks) {
          const href = link.getAttribute('href') || '';
          const llMatch = href.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (llMatch) {
            return {
              lat: parseFloat(llMatch[1]),
              long: parseFloat(llMatch[2]),
              source: 'maps-url-ll'
            };
          }
        }

        // Check script URLs
        const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        for (const script of scripts) {
          const src = script.getAttribute('src') || '';
          const latMatch = src.match(/[?&]1d(-?\d+\.\d+)/);
          const lngMatch = src.match(/[?&]2d(-?\d+\.\d+)/);
          if (latMatch && lngMatch) {
            return {
              lat: parseFloat(latMatch[1]),
              long: parseFloat(lngMatch[1]),
              source: 'maps-api-script'
            };
          }
        }

        // Quick check for data attributes
        const mapElement = document.querySelector('[data-lat][data-lng]');
        if (mapElement) {
          const lat = mapElement.getAttribute('data-lat');
          const lng = mapElement.getAttribute('data-lng');
          if (lat && lng) {
            return {
              lat: parseFloat(lat),
              long: parseFloat(lng),
              source: 'data-attributes'
            };
          }
        }

        return null;
      };

      try {
        return findCoordinates() || { lat: null, long: null, source: null };
      } catch {
        return { lat: null, long: null, source: null };
      }
    });

    // Save debug information if enabled (in parallel)
    if (debug) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugPrefix = `${debugDir}/${timestamp}`;

      await Promise.all([
        page.screenshot({
          path: `${debugPrefix}-screenshot.png`,
          fullPage: true,
          quality: 80 // Reduce quality for faster saving
        }).catch(() => {}), // Ignore screenshot errors
        fs.promises.writeFile(
          `${debugPrefix}-result.json`,
          JSON.stringify(coordinates, null, 2)
        ).catch(() => {}), // Ignore write errors
        fs.promises.writeFile(
          `${debugPrefix}-page.html`,
          await page.content()
        ).catch(() => {}) // Ignore write errors
      ]);
    }

    return coordinates;

  } catch (error) {
    if (debug) {
      console.error('Error extracting coordinates:', error);
    }
    return { lat: null, long: null, source: null };
  } finally {
    if (browser) {
      await browser.close().catch(() => {}); // Ignore close errors
    }
  }
}

module.exports = {
  extractCoordinatesFromUrl
}; 