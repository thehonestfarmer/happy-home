/**
 * Is Sold Extractor
 * 
 * Checks if a property has been sold by looking for the sold indicator.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract is_sold status from the page
 */
export const extractIsSold = (page: Page): TE.TaskEither<Error, boolean> => 
  TE.tryCatch(
    async () => {
      logger.info('Checking sold status');
      
      // Try to find the sold indicator
      const isSold = await page
        .$eval(
          "div.detail_sold",
          () => true,
        )
        .catch(() => false);
      
      logger.success(`Sold status: ${isSold ? 'SOLD' : 'Available'}`);
      return isSold;
    },
    (reason) => {
      logger.error('Failed to check sold status', reason);
      return createParserError('Failed to check sold status', {
        reason,
        selector: 'div.detail_sold'
      });
    }
  );

/**
 * Test the is_sold extractor with a static HTML file
 * This is used for unit testing
 */
export const testExtractIsSold = async (html: string): Promise<boolean> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Check if the sold indicator exists
  const soldIndicator = document.querySelector("div.detail_sold");
  return !!soldIndicator;
}; 