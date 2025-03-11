// Simple feature flags implementation reading from environment variables
export const FeatureFlags = {
  showMap: false,
  showV2Features: false,
  showCustomPriceRange: process.env.NEXT_PUBLIC_SHOW_CUSTOM_PRICE_RANGE === 'true',
  PROVIDERS_V2: false, // Hide additional auth providers for now
} as const; 