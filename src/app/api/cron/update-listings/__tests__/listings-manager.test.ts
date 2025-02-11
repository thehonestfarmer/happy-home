import { mergeListings } from '../listings-manager';
import type { ListingsData, ScrapedData } from '../types';

describe('listings-manager', () => {
  describe('mergeListings', () => {
    it('should add new listings that dont exist', async () => {
      const existing: ListingsData = {
        newListings: {
          'uuid-1': {
            id: 'uuid-1',
            addresses: '123 Main St',
            tags: 'tag1, tag2',
            listingDetail: 'detail1',
            prices: '100',
            layout: 'layout1',
            buildSqMeters: '100',
            landSqMeters: '200',
          }
        }
      };

      const scraped: ScrapedData = {
        addresses: ['456 New St'],
        tags: [['tag3', 'tag4']],
        listingDetail: ['detail2'],
        prices: ['200'],
        layout: ['layout2'],
        buildSqMeters: ['300'],
        landSqMeters: ['400'],
        ids: ['uuid-2']
      };

      const result = await mergeListings(existing, scraped);

      expect(Object.keys(result.newListings)).toHaveLength(2);
      expect(result.newListings['uuid-2']).toBeDefined();
      expect(result.newListings['uuid-2'].addresses).toBe('456 New St');
    });

    it('should update existing listings with same address', async () => {
      const existing: ListingsData = {
        newListings: {
          'uuid-1': {
            id: 'uuid-1',
            addresses: '123 Main St',
            tags: 'tag1, tag2',
            listingDetail: 'detail1',
            prices: '100',
            layout: 'layout1',
            buildSqMeters: '100',
            landSqMeters: '200',
          }
        }
      };

      const scraped: ScrapedData = {
        addresses: ['123 Main St'],
        tags: [['tag3', 'tag4']],
        listingDetail: ['detail2'],
        prices: ['200'],
        layout: ['layout2'],
        buildSqMeters: ['300'],
        landSqMeters: ['400'],
        ids: ['uuid-new']
      };

      const result = await mergeListings(existing, scraped);

      expect(Object.keys(result.newListings)).toHaveLength(1);
      expect(result.newListings['uuid-1']).toBeDefined();
      expect(result.newListings['uuid-1'].prices).toBe('200');
      expect(result.newListings['uuid-1'].tags).toBe('tag3, tag4');
    });

    it('should handle case-insensitive address matching', async () => {
      const existing: ListingsData = {
        newListings: {
          'uuid-1': {
            id: 'uuid-1',
            addresses: '123 Main St',
            tags: 'tag1, tag2',
            listingDetail: 'detail1',
            prices: '100',
            layout: 'layout1',
            buildSqMeters: '100',
            landSqMeters: '200',
          }
        }
      };

      const scraped: ScrapedData = {
        addresses: ['123 MAIN ST'],
        tags: [['tag3', 'tag4']],
        listingDetail: ['detail2'],
        prices: ['200'],
        layout: ['layout2'],
        buildSqMeters: ['300'],
        landSqMeters: ['400'],
        ids: ['uuid-new']
      };

      const result = await mergeListings(existing, scraped);

      expect(Object.keys(result.newListings)).toHaveLength(1);
      expect(result.newListings['uuid-1']).toBeDefined();
      expect(result.newListings['uuid-1'].prices).toBe('200');
    });

    it('should preserve existing fields not in scraped data', async () => {
      const existing: ListingsData = {
        newListings: {
          'uuid-1': {
            id: 'uuid-1',
            addresses: '123 Main St',
            tags: 'tag1, tag2',
            listingDetail: 'detail1',
            prices: '100',
            layout: 'layout1',
            buildSqMeters: '100',
            landSqMeters: '200',
            listingImages: ['image1.jpg'],
            recommendedText: ['text1'],
            isDetailSoldPresent: false
          }
        }
      };

      const scraped: ScrapedData = {
        addresses: ['123 Main St'],
        tags: [['tag3', 'tag4']],
        listingDetail: ['detail2'],
        prices: ['200'],
        layout: ['layout2'],
        buildSqMeters: ['300'],
        landSqMeters: ['400'],
        ids: ['uuid-new']
      };

      const result = await mergeListings(existing, scraped);

      expect(result.newListings['uuid-1'].listingImages).toEqual(['image1.jpg']);
      expect(result.newListings['uuid-1'].recommendedText).toEqual(['text1']);
      expect(result.newListings['uuid-1'].isDetailSoldPresent).toBe(false);
    });
  });
}); 