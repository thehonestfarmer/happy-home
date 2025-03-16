/**
 * Tags and Listing URL Extractors
 * 
 * Extracts property tags and the URL to the detail page.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract tags from the page
 */
export const extractTags = (page: Page): TE.TaskEither<Error, string[]> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting tags');
      
      const tags = await page.$$eval(
        "div.pickup_box.list > ul > div > ul",
        (elements) => {
          return elements.map(el => {
            const text = el.textContent?.trim() || "";
            // Split by newline to get individual tags
            return text.split('\n').map(t => t.trim()).filter(Boolean);
          }).flat();
        }
      );
      
      logger.success(`Found ${tags.length} tags`);
      return tags;
    },
    (reason) => {
      logger.error('Failed to extract tags', reason);
      return createParserError('Failed to extract tags', {
        reason,
        selector: 'div.pickup_box.list > ul > div > ul'
      });
    }
  );

/**
 * Extract listing URL from the page
 */
export const extractListingUrl = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting listing URL');
      
      const url = await page.$eval(
        "a.top-linkimg",
        (el) => (el as HTMLAnchorElement).href
      );
      
      if (!url) {
        logger.warning('No listing URL found');
        return "";
      }
      
      logger.success(`Found listing URL: ${url}`);
      return url;
    },
    (reason) => {
      logger.error('Failed to extract listing URL', reason);
      return createParserError('Failed to extract listing URL', {
        reason,
        selector: 'a.top-linkimg'
      });
    }
  );

/**
 * Test the tags extractor with a static HTML file
 */
export const testExtractTags = async (html: string): Promise<string[]> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const elements = document.querySelectorAll("div.pickup_box.list > ul > div > ul");
  
  const tags = Array.from(elements as NodeListOf<Element>).map(el => {
    const text = el.textContent?.trim() || "";
    return text.split('\n').map((t: string) => t.trim()).filter(Boolean);
  }).flat();
  
  return tags;
};

/**
 * Test the listing URL extractor with a static HTML file
 */
export const testExtractListingUrl = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const anchor = document.querySelector("a.top-linkimg") as HTMLAnchorElement;
  if (!anchor) return "";
  
  return anchor.href || "";
}; 