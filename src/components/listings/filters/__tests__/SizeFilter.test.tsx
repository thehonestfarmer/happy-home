import { render, screen, fireEvent } from '@testing-library/react';
import { SizeFilter } from '../SizeFilter';
import { AppProvider } from '@/AppContext';

describe('SizeFilter', () => {
  it('shows default label when no sizes selected', () => {
    render(
      <AppProvider>
        <SizeFilter />
      </AppProvider>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Size');
  });

  it('shows selected sizes in button label', async () => {
    render(
      <AppProvider>
        <SizeFilter />
      </AppProvider>
    );

    // Open popover
    fireEvent.click(screen.getByRole('button'));
    
    // Select building size
    const buildingSelect = screen.getByPlaceholderText('Any size');
    fireEvent.click(buildingSelect);
    fireEvent.click(screen.getByText('100m²+'));

    expect(screen.getByRole('button')).toHaveTextContent('100m²+ Build');
  });
}); 