export const JPY_TO_USD = 155;

export function parseJapanesePrice(priceStr: string): number {
  // Handle "18.8 million yen" format
  const match = priceStr.match(/(\d+\.?\d*)\s*million/);
  if (!match) return 0;
  
  const millionYen = parseFloat(match[1]);
  return millionYen * 1_000_000; // Return raw yen amount
}

export function parseLDK(layout: string): number {
  // Handle formats like "3LDK", "2DK", etc.
  const match = layout.match(/(\d+)[LD]?K/);
  return match ? parseInt(match[1], 10) : 0;
}

export const SIZES = {
  build: [50, 100, 150, 200, 250, 300],
  land: [100, 250, 500, 750, 1000, 1500, 2000],
};

// Exchange rates against JPY
export const EXCHANGE_RATES = {
  JPY: 1,
  USD: 155,
  AUD: 96,
  EUR: 160,
} as const;

export type Currency = keyof typeof EXCHANGE_RATES;

// Helper to convert between currencies
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  const inJPY = amount * EXCHANGE_RATES[from];
  return Math.round(inJPY / EXCHANGE_RATES[to]);
}

const CURRENCY_SYMBOLS = {
  JPY: "¥",
  USD: "$",
  AUD: "A$",
  EUR: "€",
} as const;

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  
  if (currency === "JPY") {
    // Format JPY in millions with one decimal place
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  
  // Format other currencies with thousands separator
  return `${symbol}${Math.round(amount).toLocaleString()}`;
} 