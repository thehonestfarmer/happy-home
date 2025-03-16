/**
 * Latitude and Longitude Extractors
 * 
 * Extracts the geographic coordinates of a property.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract latitude from the page
 */
export const extractLatitude = (page: Page): TE.TaskEither<Error, number> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting latitude');
      
      // Find the Google Maps iframe and extract its src
      const mapSrc = await page.$eval(
        "iframe.detail-googlemap", 
        (el) => el.getAttribute("src") || ""
      );
      
      // Extract latitude from the iframe src
      const latMatch = mapSrc.match(/q=(-?\d+\.\d+),/);
      if (latMatch && latMatch[1]) {
        const latitude = parseFloat(latMatch[1]);
        logger.success(`Found latitude: ${latitude}`);
        return latitude;
      }
      
      logger.warning('Could not find latitude in map source');
      return 0;
    },
    (reason) => {
      logger.error('Failed to extract latitude', reason);
      return createParserError('Failed to extract latitude', {
        reason,
        selector: 'iframe.detail-googlemap'
      });
    }
  );

/**
 * Extract longitude from the page
 */
export const extractLongitude = (page: Page): TE.TaskEither<Error, number> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting longitude');
      
      // Find the Google Maps iframe and extract its src
      const mapSrc = await page.$eval(
        "iframe.detail-googlemap", 
        (el) => el.getAttribute("src") || ""
      );
      
      // Extract longitude from the iframe src
      const lngMatch = mapSrc.match(/,(-?\d+\.\d+)/);
      if (lngMatch && lngMatch[1]) {
        const longitude = parseFloat(lngMatch[1]);
        logger.success(`Found longitude: ${longitude}`);
        return longitude;
      }
      
      logger.warning('Could not find longitude in map source');
      return 0;
    },
    (reason) => {
      logger.error('Failed to extract longitude', reason);
      return createParserError('Failed to extract longitude', {
        reason,
        selector: 'iframe.detail-googlemap'
      });
    }
  );

/**
 * Extract both latitude and longitude as a string in "lat,lng" format
 */
export const extractLatLongAsString = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting lat/long as string');
      
      // Find the Google Maps iframe and extract its src
      const mapSrc = await page.$eval(
        "iframe.detail-googlemap", 
        (el) => el.getAttribute("src") || ""
      );
      
      // Extract coordinates from the iframe src
      const coordMatch = mapSrc.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        const latLong = `${coordMatch[1]},${coordMatch[2]}`;
        logger.success(`Found lat/long: ${latLong}`);
        return latLong;
      }
      
      logger.warning('Could not find lat/long in map source');
      return '';
    },
    (reason) => {
      logger.error('Failed to extract lat/long', reason);
      return createParserError('Failed to extract lat/long', {
        reason,
        selector: 'iframe.detail-googlemap'
      });
    }
  );

/**
 * Test the latitude extractor with a static HTML file
 */
export const testExtractLatitude = async (html: string): Promise<number> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find the Google Maps iframe
  const iframe = document.querySelector("iframe.detail-googlemap");
  if (!iframe) return 0;
  
  const mapSrc = iframe.getAttribute("src") || "";
  
  // Extract latitude from the iframe src
  const latMatch = mapSrc.match(/q=(-?\d+\.\d+),/);
  if (latMatch && latMatch[1]) {
    return parseFloat(latMatch[1]);
  }
  
  return 0;
};

/**
 * Test the longitude extractor with a static HTML file
 */
export const testExtractLongitude = async (html: string): Promise<number> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Find the Google Maps iframe
  const iframe = document.querySelector("iframe.detail-googlemap");
  if (!iframe) return 0;
  
  const mapSrc = iframe.getAttribute("src") || "";
  
  // Extract longitude from the iframe src
  const lngMatch = mapSrc.match(/,(-?\d+\.\d+)/);
  if (lngMatch && lngMatch[1]) {
    return parseFloat(lngMatch[1]);
  }
  
  return 0;
}; 