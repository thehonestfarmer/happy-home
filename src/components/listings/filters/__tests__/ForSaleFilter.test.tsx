import { render, screen, fireEvent } from '@testing-library/react';
import { ForSaleFilter } from '../ForSaleFilter';
import { AppProvider } from '@/AppContext';
import '@testing-library/jest-dom';

describe('ForSaleFilter', () => {
  it('shows "For Sale" by default', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('For Sale');
  });

  it('toggles between For Sale and Sold', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );

    // Open popover and click Sold
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByLabelText('Sold'));
    expect(screen.getByRole('button')).toHaveTextContent('Sold');

    // Click For Sale
    fireEvent.click(screen.getByLabelText('For Sale'));
    expect(screen.getByRole('button')).toHaveTextContent('For Sale');
  });

  it('applies visual treatment when Sold is selected', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('bg-primary/10');

    fireEvent.click(button);
    fireEvent.click(screen.getByLabelText('Sold'));
    
    expect(button).toHaveClass('bg-primary/10');
  });
}); 