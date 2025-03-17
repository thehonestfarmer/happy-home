import { render, screen, fireEvent } from '@testing-library/react';
import { ForSaleFilter } from '../ForSaleFilter';
import { AppProvider } from '@/AppContext';
import '@testing-library/jest-dom';

describe('ForSaleFilter', () => {
  it('shows "All Properties" by default since both checkboxes are checked', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('All Properties');
  });

  it('toggles between display modes when checkboxes are changed', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );

    // Open popover
    fireEvent.click(screen.getByRole('button'));
    
    // Uncheck "For Sale" option, leaving only "Sold" checked
    fireEvent.click(screen.getByLabelText('For Sale'));
    expect(screen.getByRole('button')).toHaveTextContent('Sold');
    
    // Check "For Sale" again and uncheck "Sold", leaving only "For Sale" checked
    fireEvent.click(screen.getByLabelText('For Sale'));
    fireEvent.click(screen.getByLabelText('Sold'));
    expect(screen.getByRole('button')).toHaveTextContent('For Sale');
    
    // Check both to show "All Properties"
    fireEvent.click(screen.getByLabelText('Sold'));
    expect(screen.getByRole('button')).toHaveTextContent('All Properties');
    
    // Uncheck both to show "None Selected"
    fireEvent.click(screen.getByLabelText('For Sale'));
    fireEvent.click(screen.getByLabelText('Sold'));
    expect(screen.getByRole('button')).toHaveTextContent('None Selected');
  });

  it('applies visual treatment when non-default options are selected', () => {
    render(
      <AppProvider>
        <ForSaleFilter />
      </AppProvider>
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('bg-primary/10');

    // Open popover
    fireEvent.click(button);
    
    // Uncheck "For Sale", leaving only "Sold" checked
    fireEvent.click(screen.getByLabelText('For Sale'));
    expect(button).toHaveClass('bg-primary/10');
  });
}); 