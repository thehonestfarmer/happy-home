export const JPY_TO_USD = 155;

export function parseJapanesePrice(priceStr: string): number {
  // Handle "18.8 million yen" format
  const match = priceStr.match(/(\d+\.?\d*)\s*Million/);
  if (!match) return 0;
  
  const millionYen = parseFloat(match[1]);
  return millionYen * 1_000_000; // Return raw yen amount
}

export interface Listing {
    listingUrl: string;
    address: string;
    floorPlan?: string;
    layout?: string;
    price: string;
    landArea: string;
    buildArea: string;
    englishAddress?: string;
    originalAddress?: string;
    details?: string[];
    listingImages?: string[];
    scrapedAt?: string;
    isDetailSoldPresent?: boolean;
    isDuplicate?: boolean;
}

export function parseLayout(layoutStr: string | undefined): number {
    if (!layoutStr) return 0;
    
    // Look for LDK pattern
    const ldkMatch = layoutStr.match(/(\d+)LDK/i);
    if (ldkMatch) {
        return parseInt(ldkMatch[1], 10);
    }

    // Look for DK pattern
    const dkMatch = layoutStr.match(/(\d+)DK/i);
    if (dkMatch) {
        return parseInt(dkMatch[1], 10);
    }

    // Look for K pattern
    const kMatch = layoutStr.match(/(\d+)K/i);
    if (kMatch) {
        return parseInt(kMatch[1], 10);
    }

    return 0; // Return 0 if no valid pattern is found
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