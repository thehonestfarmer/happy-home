import listingsData from '../../../public/listings.json';
import { parseJapanesePrice, parseLDK } from '../listing-utils';

describe('Listing Data Integration', () => {
  const listings = Object.values(listingsData.newListings);

  describe('Price parsing', () => {
    it('successfully parses all listing prices', () => {
      listings.forEach(listing => {
        const price = parseJapanesePrice(listing.price);
        expect(price).toBeGreaterThan(0);
        expect(Number.isFinite(price)).toBe(true);
      });
    });

    it('maintains expected price ranges', () => {
      listings.forEach(listing => {
        const price = parseJapanesePrice(listing.price);
        // Most Japanese properties in our dataset should be between $50k and $2M USD
        expect(price).toBeGreaterThanOrEqual(50_000);
        expect(price).toBeLessThanOrEqual(2_000_000);
      });
    });
  });

  describe('LDK parsing', () => {
    it('successfully parses all listing layouts', () => {
      listings.forEach(listing => {
        if (listing.layout !== '-') { // Skip land-only listings
          const rooms = parseLDK(listing.layout);
          expect(Number.isInteger(rooms)).toBe(true);
          expect(rooms).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('handles various LDK formats', () => {
      const testCases = [
        { input: '3LDK', expected: 3 },
        { input: '2DK', expected: 2 },
        { input: '4K', expected: 4 },
        { input: '-', expected: 0 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(parseLDK(input)).toBe(expected);
      });
    });
  });

  describe('Size measurements', () => {
    it('validates building sizes are in expected range', () => {
      listings.forEach(listing => {
        if (listing.buildSqMeters !== '0') {
          const size = parseFloat(listing.buildSqMeters);
          expect(size).toBeGreaterThan(0);
          expect(size).toBeLessThan(1000); // Reasonable max size
        }
      });
    });

    it('validates land sizes are in expected range', () => {
      listings.forEach(listing => {
        const size = parseFloat(listing.landSqMeters);
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(10000); // Reasonable max size
      });
    });
  });
}); 