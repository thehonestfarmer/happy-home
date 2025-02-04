// Simple feature flags implementation reading from environment variables
export const FeatureFlags = {
  showMap: process.env.NEXT_PUBLIC_SHOW_MAP === 'true',
  showV2Features: process.env.NEXT_PUBLIC_SHOW_V2_FEATURES === 'true',
  showCustomPriceRange: process.env.NEXT_PUBLIC_SHOW_CUSTOM_PRICE_RANGE === 'true',
} as const; 