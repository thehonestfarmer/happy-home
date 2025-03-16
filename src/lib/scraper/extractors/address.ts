/**
 * Address Extractors
 * 
 * Extracts the address of a property, both in original and English formats.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';
import translate from 'translate';

// Configure translation (note: in production you'd add API key)
translate.engine = "google";

/**
 * Extract address from the page
 */
export const extractAddress = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting address');
      
      const address = await page.$eval(
        ".top_shozaichi",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!address) {
        logger.warning('No address found');
        return "";
      }
      
      logger.success(`Found address: ${address}`);
      return address;
    },
    (reason) => {
      logger.error('Failed to extract address', reason);
      return createParserError('Failed to extract address', {
        reason,
        selector: '.top_shozaichi'
      });
    }
  );

/**
 * Extract English address from the page by translating the Japanese address
 */
export const extractEnglishAddress = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting and translating address');
      
      const address = await page.$eval(
        ".top_shozaichi",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!address) {
        logger.warning('No address found to translate');
        return "";
      }
      
      try {
        // Translate the address to English
        const englishAddress = await translate(address, { from: "ja", to: "en" });
        
        // Clean up the translation
        const cleanedAddress = englishAddress
          .replace('Address:', '')
          .replace('Address display:', '')
          .replace('Address information:', '')
          .replace('housing display:', '')
          .replace('residential display:', '')
          .replace('residential information: near', '')
          .replace('residential information:', '')
          .replace('residence:', '')
          .trim();
        
        logger.success(`Translated address: ${cleanedAddress}`);
        return cleanedAddress;
      } catch (error) {
        logger.warning('Translation failed, returning original address', error);
        return address;
      }
    },
    (reason) => {
      logger.error('Failed to extract English address', reason);
      return createParserError('Failed to extract English address', {
        reason,
        selector: '.top_shozaichi'
      });
    }
  );

/**
 * Test the address extractor with a static HTML file
 */
export const testExtractAddress = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const addressElement = document.querySelector(".top_shozaichi");
  if (!addressElement) return "";
  
  return addressElement.textContent?.trim() || "";
};

/**
 * Test the English address extractor with a static HTML file
 * Note: This doesn't actually translate in the test environment
 */
export const testExtractEnglishAddress = async (html: string): Promise<string> => {
  const address = await testExtractAddress(html);
  // In a real test, you might mock the translation service
  // Here we're just returning the original address
  return address;
}; 