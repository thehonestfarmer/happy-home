import { render, screen } from '@testing-library/react';
import { ListingsGrid } from '../ListingsGrid';
import { AppProvider } from '@/AppContext';
import { defaultFilterState } from '@/AppContext';
import * as hooks from '@/hooks';
import { convertCurrency } from '@/lib/listing-utils';

// Mock sample listings data with specific prices
const mockListings = [
  {
    id: 1,
    prices: "10 million yen", // 10M JPY ≈ $67K USD
    layout: "2LDK",
    isDetailSoldPresent: false,
    // ... other required properties
  },
  {
    id: 2,
    prices: "20 million yen", // 20M JPY ≈ $134K USD
    layout: "3LDK",
    isDetailSoldPresent: false,
    // ... other required properties
  },
  {
    id: 3,
    prices: "30 million yen", // 30M JPY ≈ $201K USD
    layout: "4LDK",
    isDetailSoldPresent: false,
    // ... other required properties
  }
];

// Mock the useLoadListings hook
jest.mock('@/hooks', () => ({
  useLoadListings: jest.fn()
}));

describe('ListingsGrid', () => {
  beforeEach(() => {
    (hooks.useLoadListings as jest.Mock).mockReturnValue(mockListings);
  });

  it('shows all non-sold listings by default', () => {
    render(
      <AppProvider>
        <ListingsGrid />
      </AppProvider>
    );
    
    // Should show 2 listings (excluding the sold one)
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('shows all listings when showSold is true', () => {
    render(
      <AppProvider initialFilterState={{
        ...defaultFilterState,
        showSold: true
      }}>
        <ListingsGrid />
      </AppProvider>
    );
    
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('filters by price range', () => {
    render(
      <AppProvider initialFilterState={{
        ...defaultFilterState,
        priceRange: {
          min: 15_000_000, // 15 million yen
          max: 25_000_000  // 25 million yen
        }
      }}>
        <ListingsGrid />
      </AppProvider>
    );
    
    // Should only show the 20 million yen listing
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('filters by minimum LDK', () => {
    render(
      <AppProvider initialFilterState={{
        ...defaultFilterState,
        layout: {
          minLDK: 3
        }
      }}>
        <ListingsGrid />
      </AppProvider>
    );
    
    // Should show listings with 3LDK and 4LDK (but not the 3LDK since it's sold)
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  describe('price parsing', () => {
    it('correctly parses various price formats', () => {
      const testListings = [
        { ...mockListings[0], prices: "18.8 million yen" },
        { ...mockListings[0], prices: "20 million yen" },
        { ...mockListings[0], prices: "5.5 million yen" }
      ];
      
      (hooks.useLoadListings as jest.Mock).mockReturnValue(testListings);
      
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          priceRange: {
            min: 18_000_000,
            max: 19_000_000
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the 18.8 million listing
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
  });

  describe('layout parsing', () => {
    it('correctly parses various layout formats', () => {
      const testListings = [
        { ...mockListings[0], layout: "9DK" },
        { ...mockListings[0], layout: "2LDK" },
        { ...mockListings[0], layout: "5K" }
      ];
      
      (hooks.useLoadListings as jest.Mock).mockReturnValue(testListings);
      
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          layout: {
            minLDK: 5
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should show listings with 9DK and 5K
      expect(screen.getAllByRole('article')).toHaveLength(2);
    });
  });

  describe('ListingsGrid price filtering', () => {
    it('shows all listings when no price filter is set', () => {
      render(
        <AppProvider>
          <ListingsGrid />
        </AppProvider>
      );
      
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('filters correctly with JPY range (Under ¥15M)', () => {
      // Convert 15M JPY to USD for filter state
      const maxPriceUSD = convertCurrency(15_000_000, "JPY", "USD");
      
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          priceRange: {
            min: 0,
            max: maxPriceUSD
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the 10M listing
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('filters correctly with USD range ($100K-$200K)', () => {
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          priceRange: {
            min: 100_000,
            max: 200_000
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should show the 20M JPY listing (≈$134K USD)
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('handles edge cases in price parsing', () => {
      const edgeCaseListings = [
        { ...mockListings[0], prices: "invalid price" },
        { ...mockListings[0], prices: "15.5 million yen" },
        { ...mockListings[0], prices: "1000 million yen" }
      ];
      
      (hooks.useLoadListings as jest.Mock).mockReturnValue(edgeCaseListings);
      
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          priceRange: {
            min: convertCurrency(10_000_000, "JPY", "USD"),
            max: convertCurrency(20_000_000, "JPY", "USD")
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should handle invalid price gracefully and show the 15.5M listing
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
  });

  describe('ListingsGrid sold filter', () => {
    beforeEach(() => {
      // Mock listings with specific sold states
      const mockListingsWithSold = [
        {
          id: 1,
          prices: "10 million yen",
          layout: "2LDK",
          isDetailSoldPresent: true,  // Sold
          address: "123 Test St"
        },
        {
          id: 2,
          prices: "20 million yen",
          layout: "3LDK",
          isDetailSoldPresent: true,  // Sold
          address: "456 Test Ave"
        },
        {
          id: 3,
          prices: "30 million yen",
          layout: "4LDK",
          isDetailSoldPresent: false,  // Not sold
          address: "789 Test Rd"
        }
      ];
      
      (hooks.useLoadListings as jest.Mock).mockReturnValue(mockListingsWithSold);
    });

    it('shows only sold listings when showSold is true', () => {
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          showSold: true
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the two sold listings
      const listings = screen.getAllByRole('article');
      expect(listings).toHaveLength(2);
      
      // Verify the correct listings are shown
    });
  });

  describe('combined filters', () => {
    const mockListingsWithSold = [
      {
        id: 1,
        prices: "10 million yen", // ≈ $67K USD
        layout: "2LDK",
        isDetailSoldPresent: true,
        address: "123 Test St"
      },
      {
        id: 2,
        prices: "20 million yen", // ≈ $134K USD
        layout: "3LDK",
        isDetailSoldPresent: true,
        address: "456 Test Ave"
      },
      {
        id: 3,
        prices: "30 million yen", // ≈ $201K USD
        layout: "4LDK",
        isDetailSoldPresent: false,
        address: "789 Test Rd"
      }
    ];

    beforeEach(() => {
      (hooks.useLoadListings as jest.Mock).mockReturnValue(mockListingsWithSold);
    });

    it('applies price filter to sold listings', () => {
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          showSold: true,
          priceRange: {
            min: convertCurrency(15_000_000, "JPY", "USD"), // Filter out properties under ~$100K USD
            max: null,
            currency: "USD"
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the 20M yen sold property
      const listings = screen.getAllByRole('article');
      expect(listings).toHaveLength(1);
      expect(listings[0]).toHaveTextContent('20 million yen');
    });

    it('applies layout filter to sold listings', () => {
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          showSold: true,
          layout: {
            minLDK: 3
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the 3LDK sold property
      const listings = screen.getAllByRole('article');
      expect(listings).toHaveLength(1);
      expect(listings[0]).toHaveTextContent('3LDK');
    });

    it('combines all filters correctly', () => {
      render(
        <AppProvider initialFilterState={{
          ...defaultFilterState,
          showSold: true,
          priceRange: {
            min: convertCurrency(15_000_000, "JPY", "USD"),
            max: convertCurrency(25_000_000, "JPY", "USD"),
            currency: "USD"
          },
          layout: {
            minLDK: 3
          }
        }}>
          <ListingsGrid />
        </AppProvider>
      );
      
      // Should only show the 20M yen, 3LDK sold property
      const listings = screen.getAllByRole('article');
      expect(listings).toHaveLength(1);
      expect(listings[0]).toHaveTextContent('20 million yen');
      expect(listings[0]).toHaveTextContent('3LDK');
    });
  });
}); 