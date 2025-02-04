import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '@/AppContext';
import { PriceFilter } from '../filters/PriceFilter';
import { LDKFilter } from '../filters/LDKFilter';
import { SizeFilter } from '../filters/SizeFilter';
import { ListingsGrid } from '../ListingsGrid';

describe('Filter Integration', () => {
  it('filters affect listing display', async () => {
    render(
      <AppProvider>
        <PriceFilter />
        <LDKFilter />
        <SizeFilter />
        <ListingsGrid />
      </AppProvider>
    );

    // Set price filter
    fireEvent.click(screen.getByText('Price'));
    fireEvent.click(screen.getByText('Under $100k'));

    // Set LDK filter
    fireEvent.click(screen.getByText('LDK'));
    fireEvent.click(screen.getByText('2+'));

    // Set size filter
    fireEvent.click(screen.getByText('Size'));
    const buildingSelect = screen.getByLabelText('Building Size');
    fireEvent.change(buildingSelect, { target: { value: '100' } });

    // Verify filtered results
    const listings = screen.getAllByTestId('listing-card');
    listings.forEach(listing => {
      const price = listing.querySelector('[data-testid="price"]');
      expect(parseInt(price?.textContent || '0')).toBeLessThan(100000);

      const ldk = listing.querySelector('[data-testid="ldk"]');
      expect(parseInt(ldk?.textContent || '0')).toBeGreaterThanOrEqual(2);

      const size = listing.querySelector('[data-testid="size"]');
      expect(parseInt(size?.textContent || '0')).toBeGreaterThanOrEqual(100);
    });
  });
}); 