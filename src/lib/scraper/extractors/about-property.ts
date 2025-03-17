/**
 * About Property Extractor
 * 
 * Extracts the property description from the detail page.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract the property description from the detail page
 */
export const extractAboutProperty = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting property description');
      
      // Looking for property description which is often in a dedicated section
      const aboutPropertyText = await page.evaluate(() => {
        // Try to find the property description section by its class or header
        // The selector might need adjustment based on the actual website structure
        const aboutSection = document.querySelector('div.section.detail-section.bukken-outline');
        if (!aboutSection) return '';
        
        // Get all the text content from the section
        return aboutSection.textContent?.trim() || '';
      });
      
      if (!aboutPropertyText) {
        logger.warning('No property description found');
        return "";
      }
      
      // Clean up the text - remove excessive whitespace
      const cleanedText = aboutPropertyText
        .replace(/\s+/g, ' ')
        .trim();
      
      logger.success(`Found property description (${cleanedText.length} chars)`);
      return cleanedText;
    },
    (reason) => {
      logger.error('Failed to extract property description', reason);
      return createParserError('Failed to extract property description', {
        reason,
        selector: 'div.section.detail-section.bukken-outline'
      });
    }
  );

/**
 * Test the about property extractor with a static HTML file
 */
export const testExtractAboutProperty = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const aboutSection = document.querySelector('div.section.detail-section.bukken-outline');
  if (!aboutSection) return "";
  
  const text = aboutSection.textContent?.trim() || '';
  
  // Clean up the text - remove excessive whitespace
  return text.replace(/\s+/g, ' ').trim();
}; 