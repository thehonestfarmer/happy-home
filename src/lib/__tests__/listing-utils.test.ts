import { 
  parseJapanesePrice, 
  parseLayout, 
  convertCurrency, 
  formatPrice,
  StaticExchangeRateService,
  setExchangeRateService
} from '../listing-utils';

describe('listing utils', () => {
  describe('parseJapanesePrice', () => {
    test('handles empty input', () => {
      expect(parseJapanesePrice('')).toBe(0);
      expect(parseJapanesePrice(undefined as any)).toBe(0);
    });

    test('parses prices with 万円 (man-yen) format', () => {
      expect(parseJapanesePrice('693万円')).toBe(6_930_000);
      expect(parseJapanesePrice('5,000万円')).toBe(50_000_000);
      expect(parseJapanesePrice('3.5万円')).toBe(35_000);
    });

    test('parses prices with 億円 (oku-yen) format', () => {
      expect(parseJapanesePrice('1億円')).toBe(100_000_000);
      expect(parseJapanesePrice('1億2000万円')).toBe(120_000_000);
      expect(parseJapanesePrice('2.5億円')).toBe(250_000_000);
    });

    test('parses English "Million" format', () => {
      expect(parseJapanesePrice('18.8 Million')).toBe(18_800_000);
      expect(parseJapanesePrice('1.5Million')).toBe(1_500_000);
    });

    test('falls back to numeric extraction when no pattern matches', () => {
      expect(parseJapanesePrice('12345')).toBe(12345);
    });
  });

  describe('parseLayout', () => {
    test('parses LDK values correctly', () => {
      expect(parseLayout('2LDK')).toBe(2);
      expect(parseLayout('3LDK')).toBe(3);
      expect(parseLayout('4LDK')).toBe(4);
    });

    test('parses DK values correctly', () => {
      expect(parseLayout('1DK')).toBe(1);
      expect(parseLayout('2DK')).toBe(2);
    });

    test('returns 0 for invalid format', () => {
      expect(parseLayout('')).toBe(0);
      expect(parseLayout(undefined)).toBe(0);
    });
  });

  describe('currency conversion', () => {
    test('converts between currencies correctly', () => {
      // Set up a service with known exchange rates for testing
      const testRates = {
        JPY: 1,
        USD: 100,  // 1 USD = 100 JPY
        EUR: 120,  // 1 EUR = 120 JPY
      };
      
      setExchangeRateService(new StaticExchangeRateService(testRates as any));
      
      // 10,000 JPY should be 100 USD (10000 * (1/100) = 100)
      expect(convertCurrency(10000, 'JPY', 'USD')).toBe(100);
      
      // 100 USD should be 10,000 JPY (100 * 100 = 10000)
      expect(convertCurrency(100, 'USD', 'JPY')).toBe(10000);
      
      // 100 USD should be 83 EUR (100 * (100/120) = 83.33, rounded to 83)
      expect(convertCurrency(100, 'USD', 'EUR')).toBe(83);

      // Add test for large values
      // 21,000,000 JPY should be 210,000 USD with our test rate
      expect(convertCurrency(21000000, 'JPY', 'USD')).toBe(210000);
    });
  });

  describe('formatPrice', () => {
    test('formats JPY in millions', () => {
      expect(formatPrice(10000000, 'JPY')).toBe('¥10.0M');
      expect(formatPrice(1500000, 'JPY')).toBe('¥1.5M');
    });

    test('formats other currencies with thousands separator', () => {
      expect(formatPrice(10000, 'USD')).toBe('$10,000');
      expect(formatPrice(1500, 'EUR')).toBe('€1,500');
    });
  });
}); 