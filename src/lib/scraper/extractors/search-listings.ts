/**
 * Search Listings Extractor
 * 
 * Extracts listings from a search results page.
 */

import { Page } from 'puppeteer';
import * as TE from 'fp-ts/lib/TaskEither';
import { createParserError } from '../utils/error-handling';
import { logger } from '../utils/logger';

/**
 * Listing data structure representing a single listing from the search page
 */
export interface SearchListingData {
  title: string;
  detailUrl: string;
  price: string;
  isNew: boolean;
  isUpdated: boolean;
  address: string;
  floorPlan: string;
  images: string[];
  buildArea: string;
  landArea: string;
  nearestStation: string;
  builtDate: string;
  transactionType: string;
  recommendedPoints: string;
  tags: string[];
}

/**
 * Extract all listings from the search results page
 */
export const extractSearchListings = (page: Page): TE.TaskEither<Error, SearchListingData[]> => 
  TE.tryCatch(
    async () => {
      logger.info('Extracting listings from search page');
      
      // Extract listings from the bukken_list container
      const listings = await page.evaluate(() => {
        const listingElements = document.querySelectorAll('#bukken_list > li.cf');
        const extractedListings = [];
        
        for (const element of Array.from(listingElements)) {
          try {
            // Get the detail URL
            const linkElement = element.querySelector('a');
            const detailUrl = linkElement?.getAttribute('href') || '';
            
            // Get the title
            const titleElement = element.querySelector('dt.entry-title');
            const title = titleElement?.textContent?.trim() || '';
            
            // Check if listing is new or updated
            const newMarkElement = element.querySelector('.new_mark');
            const isNew = newMarkElement?.classList.contains('new') || false;
            const isUpdated = newMarkElement?.classList.contains('update') || false;
            
            // Get the images
            const imageElements = element.querySelectorAll('.list_img img');
            const images = Array.from(imageElements).map(img => (img as HTMLImageElement).src);
            
            // Extract property details from the list
            const detailItems = element.querySelectorAll('dd.list_detail > ul > li > dl');
            
            // Initialize variables to store extracted data
            let price = '';
            let floorPlan = '';
            let address = '';
            let nearestStation = '';
            let builtDate = '';
            let buildArea = '';
            let landArea = '';
            let transactionType = '';
            
            // Extract data from detail items
            for (const item of Array.from(detailItems)) {
              const label = item.querySelector('dt')?.textContent?.trim() || '';
              const value = item.querySelector('dd')?.textContent?.trim() || '';
              
              switch (label) {
                case '総額':
                  price = value;
                  break;
                case '間取り':
                  floorPlan = value;
                  break;
                case '住居表示':
                  address = value;
                  break;
                case '最寄り駅':
                  nearestStation = value;
                  break;
                case '新築年月':
                  builtDate = value;
                  break;
                case '建物面積':
                  buildArea = value;
                  break;
                case '土地面積':
                  landArea = value;
                  break;
                case '取引態様':
                  transactionType = value;
                  break;
              }
            }
            
            // Extract tags
            const tagElements = element.querySelectorAll('.pickup_box.list .facility > li');
            const tags = Array.from(tagElements).map(el => el.textContent?.trim() || '');
            
            // Extract recommended points
            const recommendedPointsElement = element.querySelector('.detail_txt.recommend_txt dd p');
            const recommendedPoints = recommendedPointsElement?.textContent?.trim() || '';
            
            // Create the listing object
            extractedListings.push({
              title,
              detailUrl,
              price,
              isNew,
              isUpdated,
              address,
              floorPlan,
              images,
              buildArea,
              landArea,
              nearestStation,
              builtDate,
              transactionType,
              recommendedPoints,
              tags
            });
          } catch (error) {
            console.error('Error extracting listing data:', error);
          }
        }
        
        return extractedListings;
      });
      
      logger.success(`Found ${listings.length} listings`);
      return listings;
    },
    (reason) => {
      logger.error('Failed to extract listings from search page', reason);
      return createParserError('Failed to extract listings from search page', {
        reason,
        selector: '#bukken_list > li.cf'
      });
    }
  );

/**
 * Test the search listings extractor with a static HTML file
 */
export const testExtractSearchListings = async (html: string): Promise<SearchListingData[]> => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const listingElements = document.querySelectorAll('#bukken_list > li.cf');
  const extractedListings: SearchListingData[] = [];
  
  // Define Element type for use in test function
  type Element = ReturnType<typeof document.createElement>;
  
  for (const element of Array.from(listingElements) as Element[]) {
    try {
      // Get the detail URL
      const linkElement = element.querySelector('a') as Element | null;
      const detailUrl = linkElement?.getAttribute('href') || '';
      
      // Get the title
      const titleElement = element.querySelector('dt.entry-title') as Element | null;
      const title = titleElement?.textContent?.trim() || '';
      
      // Check if listing is new or updated
      const newMarkElement = element.querySelector('.new_mark') as Element | null;
      const isNew = newMarkElement?.classList?.contains('new') || false;
      const isUpdated = newMarkElement?.classList?.contains('update') || false;
      
      // Get the images
      const imageElements = element.querySelectorAll('.list_img img');
      const images = Array.from(imageElements).map(img => (img as Element).getAttribute('src') || '');
      
      // Extract property details from the list
      const detailItems = element.querySelectorAll('dd.list_detail > ul > li > dl');
      
      // Initialize variables to store extracted data
      let price = '';
      let floorPlan = '';
      let address = '';
      let nearestStation = '';
      let builtDate = '';
      let buildArea = '';
      let landArea = '';
      let transactionType = '';
      
      // Extract data from detail items
      for (const item of Array.from(detailItems) as Element[]) {
        const label = (item.querySelector('dt') as Element | null)?.textContent?.trim() || '';
        const value = (item.querySelector('dd') as Element | null)?.textContent?.trim() || '';
        
        switch (label) {
          case '総額':
            price = value;
            break;
          case '間取り':
            floorPlan = value;
            break;
          case '住居表示':
            address = value;
            break;
          case '最寄り駅':
            nearestStation = value;
            break;
          case '新築年月':
            builtDate = value;
            break;
          case '建物面積':
            buildArea = value;
            break;
          case '土地面積':
            landArea = value;
            break;
          case '取引態様':
            transactionType = value;
            break;
        }
      }
      
      // Extract tags
      const tagElements = element.querySelectorAll('.pickup_box.list .facility > li');
      const tags = Array.from(tagElements).map(el => (el as Element).textContent?.trim() || '');
      
      // Extract recommended points
      const recommendedPointsElement = element.querySelector('.detail_txt.recommend_txt dd p') as Element | null;
      const recommendedPoints = recommendedPointsElement?.textContent?.trim() || '';
      
      // Create the listing object
      extractedListings.push({
        title,
        detailUrl,
        price,
        isNew,
        isUpdated,
        address,
        floorPlan,
        images,
        buildArea,
        landArea,
        nearestStation,
        builtDate,
        transactionType,
        recommendedPoints,
        tags
      });
    } catch (error) {
      console.error('Error extracting listing data:', error);
    }
  }
  
  return extractedListings;
}; 