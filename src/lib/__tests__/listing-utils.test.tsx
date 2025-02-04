import { formatPrice, Currency } from '../listing-utils';

describe('formatPrice', () => {
  it('formats JPY in millions', () => {
    expect(formatPrice(15_000_000, 'JPY')).toBe('¥15.0M');
    expect(formatPrice(1_500_000, 'JPY')).toBe('¥1.5M');
    expect(formatPrice(150_000_000, 'JPY')).toBe('¥150.0M');
  });

  it('formats USD with thousands separator', () => {
    expect(formatPrice(100000, 'USD')).toBe('$100,000');
    expect(formatPrice(1000000, 'USD')).toBe('$1,000,000');
    expect(formatPrice(1500, 'USD')).toBe('$1,500');
  });

  it('formats AUD with correct symbol', () => {
    expect(formatPrice(150000, 'AUD')).toBe('A$150,000');
  });

  it('formats EUR with correct symbol', () => {
    expect(formatPrice(150000, 'EUR')).toBe('€150,000');
  });

  it('handles zero and small numbers', () => {
    expect(formatPrice(0, 'JPY')).toBe('¥0.0M');
    expect(formatPrice(0, 'USD')).toBe('$0');
    expect(formatPrice(1, 'USD')).toBe('$1');
  });
}); 