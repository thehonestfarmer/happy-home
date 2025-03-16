/**
 * Listing Images Extractor
 * 
 * Extracts listing images from a detail page.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract listing images from the page
 */
export const extractListingImages = (page: Page): TE.TaskEither<Error, string[]> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting listing images');
      
      // Extract images from the slick track container
      const listingImages = await page.$$eval(".slick-track", (elements) => {
        const images = elements
          .map((el) => {
            const list = el.querySelectorAll("li > a > img");
            return Array.from(list).map((li) => (li as HTMLImageElement).src);
          })
          .flat();
        return images;
      });
      
      logger.success(`Found ${listingImages.length} images`);
      return listingImages;
    },
    (reason) => {
      logger.error('Failed to extract listing images', reason);
      return createParserError('Failed to extract listing images', {
        reason,
        selector: '.slick-track'
      });
    }
  );

/**
 * Test the listing images extractor with a static HTML file
 * This is used for unit testing
 */
export const testExtractListingImages = async (html: string): Promise<string[]> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Using type assertion to handle the DOM elements correctly
  const elements = Array.from(document.querySelectorAll(".slick-track"));
  const images: string[] = [];
  
  for (const el of elements as Element[]) {
    const list = Array.from(el.querySelectorAll("li > a > img"));
    for (const img of list as HTMLImageElement[]) {
      // Need to use getAttribute for JSDOM environment
      const src = img.getAttribute('src');
      if (src) {
        images.push(src);
      }
    }
  }
  
  return images;
}; 