export const JPY_TO_USD = 155;

// Exchange rates against JPY - This will be refactored to support dynamic updates
export const EXCHANGE_RATES = {
  JPY: 1,
  USD: 155,
  AUD: 96,
  EUR: 160,
} as const;

/**
 * Interface for currency exchange rate service
 * This allows us to easily switch between static rates and third-party services
 */
export interface ExchangeRateService {
  getRate: (from: Currency, to: Currency) => number;
}

/**
 * Static implementation of exchange rate service using predefined rates
 */
export class StaticExchangeRateService implements ExchangeRateService {
  private rates: Record<Currency, number>;
  
  constructor(rates: Record<Currency, number> = EXCHANGE_RATES) {
    this.rates = rates;
  }
  
  getRate(from: Currency, to: Currency): number {
    return this.rates[from] / this.rates[to];
  }
}

// Default exchange rate service instance
// This can be replaced with a different implementation (e.g., API-based)
// without changing the consuming code
let exchangeRateService: ExchangeRateService = new StaticExchangeRateService();

/**
 * Set a new exchange rate service implementation
 * @param service The new exchange rate service to use
 */
export function setExchangeRateService(service: ExchangeRateService): void {
  exchangeRateService = service;
}

export type Currency = keyof typeof EXCHANGE_RATES;

/**
 * Parse Japanese price notation into JPY numeric value
 * Handles formats like:
 * - "693万円" (6.93 million yen)
 * - "1億2000万円" (120 million yen)
 * - "18.8 Million" (18.8 million yen)
 * - "5,000万円" (50 million yen)
 * 
 * @param priceStr The price string in Japanese notation
 * @returns The price in JPY (as a number)
 */
export function parseJapanesePrice(priceStr: string | number): number {
  if (!priceStr) return 0;
  
  // If price is already a number, return it
  if (typeof priceStr === 'number') return priceStr;
  
  // Convert to string and remove commas and spaces
  const normalized = String(priceStr).replace(/,|\s+/g, '');
  
  // Handle "18.8 Million" format (English)
  const millionMatch = normalized.match(/(\d+\.?\d*)Million/i);
  if (millionMatch) {
    const millionYen = parseFloat(millionMatch[1]);
    return millionYen * 1_000_000;
  }
  
  // Handle "693万円" format (Japanese)
  const manYenMatch = normalized.match(/(\d+\.?\d*)万円?/);
  if (manYenMatch) {
    const manYen = parseFloat(manYenMatch[1]);
    return manYen * 10_000;
  }
  
  // Handle "1億2000万円" format (Japanese)
  const okuYenMatch = normalized.match(/(\d+\.?\d*)億(?:(\d+\.?\d*)万)?円?/);
  if (okuYenMatch) {
    const oku = parseFloat(okuYenMatch[1] || '0');
    const man = parseFloat(okuYenMatch[2] || '0');
    return oku * 100_000_000 + man * 10_000;
  }
  
  // Try to extract just numbers as a fallback
  const numericMatch = normalized.match(/(\d+\.?\d*)/);
  if (numericMatch) {
    return parseFloat(numericMatch[1]);
  }
  
  return 0;
}

/**
 * Helper to convert between currencies using the current exchange rate service
 * @param amount The amount to convert
 * @param from Source currency
 * @param to Target currency
 * @returns The converted amount
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  
  // Apply the exchange rate to convert from the source currency to the target currency
  return Math.round(amount * exchangeRateService.getRate(from, to));
}

export const CURRENCY_SYMBOLS = {
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

export interface Listing {
    id: string;
    listingUrl: string;
    address: string;
    floorPlan?: string;
    layout?: string;
    price: string;
    landArea: string;
    buildDate: string;
    buildArea: string;
    englishAddress?: string;
    originalAddress?: string;
    details?: string[];
    listingImages?: string[];
    scrapedAt?: string;
    isDetailSoldPresent?: boolean;
    isDuplicate?: boolean;
    isSold?: boolean;
    propertyTitle?: string;
    propertyCaption?: string;
    hashTags?: string;
    listingDetail?: string;
    tags?: string;
    listingDetailUrl?: string;
    removed?: boolean;
    
    // New properties from enhanced data
    buildSqMeters?: string;
    landSqMeters?: string;
    aboutProperty?: string | null;
    coordinates?: {
        lat: number | null;
        long: number | null;
    };
    dates?: {
        datePosted: string | null;
        dateRenovated: string | null;
    };
    facilities?: {
        water: string | null;
        gas: string | null;
        sewage: string | null;
        greyWater: string | null;
    };
    schools?: {
        primary: string | null;
        juniorHigh: string | null;
    };
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

/**
 * Conversion factor from square meters to square feet
 * 1 square meter = 10.7639 square feet
 */
export const SQ_METERS_TO_SQ_FEET = 10.7639;

/**
 * Format an area measurement with the appropriate unit based on the selected currency
 * For USD currency, converts m² to sq ft for familiarity to American users
 * 
 * @param area The area value (can be string or number, can include units)
 * @param currency The currently selected currency
 * @param includeConversion Whether to include the original value in parentheses
 * @returns Formatted area string with appropriate units
 */
export function formatArea(area: string | number | undefined | null, currency: Currency, includeConversion = false): string {
  if (!area) return 'N/A';
  
  // If already a number, use it directly
  let numericValue: number;
  let originalUnit = 'm²';
  
  if (typeof area === 'number') {
    numericValue = area;
  } else {
    // Remove commas from the string before extracting the number
    const normalizedArea = area.replace(/,/g, '');
    
    // Try to extract numeric value from string
    const numericMatch = normalizedArea.match(/(\d+(?:\.\d+)?)/);
    if (!numericMatch) return area.toString(); // Return original if no number found
    
    numericValue = parseFloat(numericMatch[1]);
    
    // Try to detect if the value is already in sq ft
    if (area.toLowerCase().includes('sq ft') || area.toLowerCase().includes('sqft') || 
        area.toLowerCase().includes('ft²') || area.toLowerCase().includes('square feet')) {
      originalUnit = 'sq ft';
    }
    // Check for m² or ㎡ symbols to confirm it's in square meters
    else if (area.includes('m²') || area.includes('㎡')) {
      originalUnit = 'm²';
    }
  }
  
  // For JPY or non-USD currencies, display in m²
  if (currency !== 'USD') {
    return `${numericValue.toLocaleString()} m²`;
  }
  
  // For USD currency, convert to sq ft if currently in m²
  if (originalUnit === 'm²') {
    const sqFeet = Math.round(numericValue * SQ_METERS_TO_SQ_FEET);
    
    if (includeConversion) {
      return `${sqFeet.toLocaleString()} sq ft (${numericValue.toLocaleString()} m²)`;
    } else {
      return `${sqFeet.toLocaleString()} sq ft`;
    }
  } else {
    // Already in sq ft
    return `${numericValue.toLocaleString()} sq ft`;
  }
}