import { parseJapanesePrice, parseLDK } from '../listing-utils';

describe('listing utils', () => {
  describe('parseJapanesePrice', () => {
    it('converts million yen to USD', () => {
      expect(parseJapanesePrice('18.8 million yen')).toBe(121290);
      expect(parseJapanesePrice('25 million yen')).toBe(161290);
    });

    it('handles invalid formats', () => {
      expect(parseJapanesePrice('invalid')).toBe(0);
      expect(parseJapanesePrice('')).toBe(0);
    });
  });

  describe('parseLDK', () => {
    it('extracts number from LDK format', () => {
      expect(parseLDK('3LDK')).toBe(3);
      expect(parseLDK('2DK')).toBe(2);
      expect(parseLDK('4K')).toBe(4);
    });

    it('handles invalid formats', () => {
      expect(parseLDK('invalid')).toBe(0);
      expect(parseLDK('')).toBe(0);
    });
  });
}); 