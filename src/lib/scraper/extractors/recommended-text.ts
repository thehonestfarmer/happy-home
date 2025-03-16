/**
 * Recommended Text Extractor
 * 
 * Extracts the recommended text or highlights from a property detail page.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract the recommended text from the property detail page
 */
export const extractRecommendedText = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting recommended text');
      
      // Attempt to extract the recommended text section
      const recommendedText = await page.evaluate(() => {
        // Look for the recommended text section - adjust selector based on actual site structure
        const recommendedSection = document.querySelector('div.detail-comment');
        if (!recommendedSection) return '';
        
        // Get the text content
        return recommendedSection.textContent?.trim() || '';
      });
      
      if (!recommendedText) {
        logger.warning('No recommended text found');
        return "";
      }
      
      // Clean up the text - remove excessive whitespace and unnecessary characters
      const cleanedText = recommendedText
        .replace(/\s+/g, ' ')
        .trim();
      
      logger.success(`Found recommended text (${cleanedText.length} chars)`);
      return cleanedText;
    },
    (reason) => {
      logger.error('Failed to extract recommended text', reason);
      return createParserError('Failed to extract recommended text', {
        reason,
        selector: 'div.detail-comment'
      });
    }
  );

/**
 * Test the recommended text extractor with a static HTML file
 */
export const testExtractRecommendedText = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const recommendedSection = document.querySelector('div.detail-comment');
  if (!recommendedSection) return "";
  
  const text = recommendedSection.textContent?.trim() || '';
  
  // Clean up the text
  return text.replace(/\s+/g, ' ').trim();
}; 