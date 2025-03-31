"use client";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import { Currency } from "@/lib/listing-utils";
import { createClientComponentClient, type User as SupabaseUser } from '@supabase/auth-helpers-nextjs';

// Comprehensive detection of embedded browsers
function detectEmbeddedBrowser(): string {
  if (typeof window === 'undefined' || !window.navigator) return 'Standard Browser';
  
  const ua = navigator.userAgent;
  
  // Instagram browser detection
  if (/Instagram/.test(ua)) {
    return 'Instagram';
  }
  
  // Facebook in-app browser
  if (/FBAN|FBAV/.test(ua)) {
    return 'Facebook';
  }
  
  // TikTok in-app browser
  if (/TikTok/.test(ua)) {
    return 'TikTok';
  }
  
  // Twitter/X in-app browser
  if (/Twitter/.test(ua)) {
    return 'Twitter';
  }
  
  // LinkedIn in-app browser
  if (/LinkedInApp/.test(ua)) {
    return 'LinkedIn';
  }
  
  // Snapchat in-app browser
  if (/Snapchat/.test(ua)) {
    return 'Snapchat';
  }
  
  // WeChat embedded browser
  if (/MicroMessenger/.test(ua)) {
    return 'WeChat';
  }
  
  // Line app browser
  if (/Line\//.test(ua)) {
    return 'Line';
  }
  
  // Generic WebView detection (Android)
  if (/Android.*wv/.test(ua)) {
    return 'Android WebView';
  }
  
  return 'Standard Browser';
}

// Local storage key constants
const FILTER_STATE_KEY = 'happyhome:filterState';

// Utility function to safely check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Utility function to safely load filter state from localStorage
const loadFilterStateFromStorage = (): FilterState | null => {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    const savedFilterState = localStorage.getItem(FILTER_STATE_KEY);
    if (!savedFilterState) return null;
    
    return JSON.parse(savedFilterState) as FilterState;
  } catch (error) {
    console.error('[AppContext] Error parsing filter state from localStorage:', error);
    return null;
  }
};

// Get initial filter state - try from localStorage first, fallback to default
const getInitialFilterState = (): FilterState => {
  const savedState = typeof window !== 'undefined' ? loadFilterStateFromStorage() : null;
  return savedState || defaultFilterState;
};

interface PriceFilterState {
  selectedCurrency: Currency;
  selectedRangeIndex: number | null;
  localRange: [number, number];
}

interface AppContextType {
  displayState: DisplayState;
  filterState: FilterState;
  priceFilterState: PriceFilterState;
  user: SupabaseUser | null;
  favorites: string[];
  isReady: boolean;
  browserType: string;
  isEmbeddedBrowser: boolean;
  setDisplayState: (draft: DisplayState) => void;
  setFilterState: (draft: FilterState) => void;
  setPriceFilterState: (updater: (draft: PriceFilterState) => void) => void;
  setUser: (user: SupabaseUser | null) => void;
  setFavorites: (favorites: string[]) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export type FilterState = {
  showForSale: boolean;
  showSold: boolean;
  showOnlyFavorites: boolean;
  showOnlySeen: boolean;
  priceRange: {
    min: number | null;
    max: number | null;
    currency: Currency;
  };
  layout: {
    minLDK: number | null;
  };
  size: {
    minBuildSize: number | null;
    maxBuildSize: number | null;
    minLandSize: number | null;
    maxLandSize: number | null;
  };
};

export const defaultFilterState: FilterState = {
  showForSale: true,
  showSold: true,
  showOnlyFavorites: false,
  showOnlySeen: false,
  priceRange: {
    min: null,
    max: null,
    currency: "USD"
  },
  layout: {
    minLDK: null,
  },
  size: {
    minBuildSize: null,
    maxBuildSize: null,
    minLandSize: null,
    maxLandSize: null,
  },
};

export type SortOption = 'recommended' | 'newest' | 'price-asc' | 'price-desc' | 'sqft' | 'lot-size' | 'price-sqft';

export type DisplayState = {
  lightboxListingIdx: number[] | null;
  drawerOpen: boolean;
  sortBy: SortOption;
};

export function AppProvider({ children }: { children: ReactNode }) {
  // Flag to track if initial load from localStorage is complete
  const isInitialized = useRef(false);
  // State to track if the context is ready (filter state loaded)
  const [isReady, setIsReady] = useImmer(false);
  // Check if localStorage is available
  const canUseLocalStorage = isLocalStorageAvailable();

  const [displayState, setDisplayState] = useImmer<DisplayState>({
    lightboxListingIdx: null,
    drawerOpen: false,
    sortBy: 'newest',
  });

  // Initialize with filter state from localStorage if available, else use default
  const [filterState, setFilterState] = useImmer<FilterState>(
    getInitialFilterState()
  );

  const [priceFilterState, setPriceFilterState] = useImmer<PriceFilterState>({
    selectedCurrency: "JPY",
    selectedRangeIndex: null,
    localRange: [0, 100_000_000],
  });

  const [user, setUser] = useImmer<SupabaseUser | null>(null);
  const [favorites, setFavorites] = useImmer<string[]>([]);
  const [browserType, setBrowserType] = useImmer<string>('Standard Browser'); 

  // Detect browser type on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const detectedBrowser = detectEmbeddedBrowser();
      setBrowserType(detectedBrowser);
      console.log(`[AppContext] Browser detected: ${detectedBrowser}`);
    }
  }, []);

  // Helper computed property to easily check if this is an embedded browser
  const isEmbeddedBrowser = browserType !== 'Standard Browser';

  // Double-check localStorage on mount (for client-side hydration)
  useEffect(() => {
    if (!canUseLocalStorage) {
      isInitialized.current = true;
      setIsReady(true);
      return;
    }

    try {
      const savedFilterState = localStorage.getItem(FILTER_STATE_KEY);
      if (savedFilterState) {
        const parsedFilterState = JSON.parse(savedFilterState) as FilterState;
        setFilterState(parsedFilterState);
      }
    } catch (error) {
      console.error('[AppContext] Error loading filter state from localStorage:', error);
    }
    
    // Mark initialization as complete
    isInitialized.current = true;
    setIsReady(true);
  }, []);

  // Save filter state to localStorage when it changes
  useEffect(() => {
    // Skip saving during the initial load or if localStorage isn't available
    if (!isInitialized.current || !canUseLocalStorage) return;
    
    try {
      localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filterState));
    } catch (error) {
      console.error('[AppContext] Error saving filter state to localStorage:', error);
    }
  }, [filterState]);

  // Handle Supabase auth state
  useEffect(() => {
    const supabase = createClientComponentClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Add effect to load favorites when user changes
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) {
        setFavorites([]);
        return;
      }

      // Debug log to track when this runs
      console.log(`[AppContext] Loading favorites for user: ${user.id?.substring(0, 8)}...`);
      
      // Add a condition to prevent duplicate API calls if we already have favorites
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('user_favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[AppContext] Error loading favorites:', error);
        return;
      }

      if (data) {
        const favoriteIds = data.map(f => f.listing_id);
        console.log(`[AppContext] Loaded ${favoriteIds.length} favorites`);
        setFavorites(favoriteIds);
      }
    };

    // We only want to load favorites once when the user logs in
    // Use a ref to track if we've loaded favorites for this user
    loadFavorites();
  }, [user?.id]); // Change dependency to user.id instead of user object

  const value = {
    displayState,
    filterState,
    priceFilterState,
    user,
    favorites,
    isReady,
    browserType,
    isEmbeddedBrowser,
    setDisplayState,
    setFilterState,
    setPriceFilterState,
    setUser,
    setFavorites,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("AppContext must be used within an AppProvider");
  }

  return context;
};
