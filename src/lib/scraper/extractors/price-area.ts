/**
 * Price and Area Extractors
 * 
 * Extracts price, floor plan, land area, and build area from listing pages.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Extract price from the page
 */
export const extractPrice = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting price');
      
      const price = await page.$eval(
        ".top_price",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!price) {
        logger.warning('No price found');
        return "";
      }
      
      logger.success(`Found price: ${price}`);
      return price;
    },
    (reason) => {
      logger.error('Failed to extract price', reason);
      return createParserError('Failed to extract price', {
        reason,
        selector: '.top_price'
      });
    }
  );

/**
 * Extract floor plan from the page
 */
export const extractFloorPlan = (page: Page): TE.TaskEither<Error, string> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting floor plan');
      
      const floorPlan = await page.$eval(
        ".top_madori",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!floorPlan) {
        logger.warning('No floor plan found');
        return "";
      }
      
      logger.success(`Found floor plan: ${floorPlan}`);
      return floorPlan;
    },
    (reason) => {
      logger.error('Failed to extract floor plan', reason);
      return createParserError('Failed to extract floor plan', {
        reason,
        selector: '.top_madori'
      });
    }
  );

/**
 * Extract land area from the page
 */
export const extractLandArea = (page: Page): TE.TaskEither<Error, number> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting land area');
      
      const landAreaText = await page.$eval(
        ".top_menseki",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!landAreaText) {
        logger.warning('No land area found');
        return 0;
      }
      
      // Extract the number from "土地面積: 123.45m²"
      const match = landAreaText.match(/土地面積: ([\d.]+)m²/);
      if (match && match[1]) {
        const area = parseFloat(match[1]);
        logger.success(`Found land area: ${area} m²`);
        return area;
      }
      
      logger.warning('Could not parse land area from text');
      return 0;
    },
    (reason) => {
      logger.error('Failed to extract land area', reason);
      return createParserError('Failed to extract land area', {
        reason,
        selector: '.top_menseki'
      });
    }
  );

/**
 * Extract build area from the page
 */
export const extractBuildArea = (page: Page): TE.TaskEither<Error, number> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting build area');
      
      const buildAreaText = await page.$eval(
        ".top_tatemono",
        (el) => el.textContent?.trim() || ""
      );
      
      if (!buildAreaText) {
        logger.warning('No build area found');
        return 0;
      }
      
      // Extract the number from "建物面積: 123.45m²"
      const match = buildAreaText.match(/建物面積: ([\d.]+)m²/);
      if (match && match[1]) {
        const area = parseFloat(match[1]);
        logger.success(`Found build area: ${area} m²`);
        return area;
      }
      
      logger.warning('Could not parse build area from text');
      return 0;
    },
    (reason) => {
      logger.error('Failed to extract build area', reason);
      return createParserError('Failed to extract build area', {
        reason,
        selector: '.top_tatemono'
      });
    }
  );

/**
 * Test extractors with static HTML
 */
export const testExtractPrice = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const element = document.querySelector(".top_price");
  if (!element) return "";
  
  return element.textContent?.trim() || "";
};

export const testExtractFloorPlan = async (html: string): Promise<string> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const element = document.querySelector(".top_madori");
  if (!element) return "";
  
  return element.textContent?.trim() || "";
};

export const testExtractLandArea = async (html: string): Promise<number> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const element = document.querySelector(".top_menseki");
  if (!element) return 0;
  
  const text = element.textContent?.trim() || "";
  const match = text.match(/土地面積: ([\d.]+)m²/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  
  return 0;
};

export const testExtractBuildArea = async (html: string): Promise<number> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const element = document.querySelector(".top_tatemono");
  if (!element) return 0;
  
  const text = element.textContent?.trim() || "";
  const match = text.match(/建物面積: ([\d.]+)m²/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  
  return 0;
}; 