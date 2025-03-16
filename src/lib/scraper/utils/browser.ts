/**
 * Browser Utilities
 * 
 * Provides utility functions for browser management with TaskEither for error handling.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither.js';
import { logger } from './logger';

/**
 * Initialize a new browser instance
 */
export const initBrowser = (): TE.TaskEither<Error, Browser> => 
  TE.tryCatch(
    async () => {
      logger.info("Initializing browser");
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      logger.success("Browser initialized successfully");
      return browser;
    },
    (reason) => {
      logger.error("Failed to launch browser", reason);
      return new Error(`Failed to launch browser: ${reason}`);
    }
  );

/**
 * Close a browser instance
 */
export const closeBrowser = (browser: Browser): TE.TaskEither<Error, void> => 
  TE.tryCatch(
    async () => {
      logger.info("Closing browser");
      await browser.close();
      logger.success("Browser closed successfully");
    },
    (reason) => {
      logger.error("Failed to close browser", reason);
      return new Error(`Failed to close browser: ${reason}`);
    }
  );

/**
 * Navigate to a page with a browser instance
 */
export const navigateToPage = (url: string) => (browser: Browser): TE.TaskEither<Error, Page> => 
  TE.tryCatch(
    async () => {
      logger.info(`Navigating to ${url}`);
      const page = await browser.newPage();
      
      // Set up timeout and user agent
      page.setDefaultNavigationTimeout(30000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle0' });
      logger.success(`Successfully loaded ${url}`);
      return page;
    },
    (reason) => {
      logger.error(`Failed to navigate to ${url}`, reason);
      return new Error(`Failed to navigate to ${url}: ${reason}`);
    }
  );

/**
 * Close a page
 */
export const closePage = (page: Page): TE.TaskEither<Error, void> =>
  TE.tryCatch(
    async () => {
      await page.close();
    },
    (reason) => {
      logger.error("Failed to close page", reason);
      return new Error(`Failed to close page: ${reason}`);
    }
  ); 