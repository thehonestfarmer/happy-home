import { render, screen, fireEvent } from '@testing-library/react';
import { PriceFilter } from '../PriceFilter';
import { AppProvider } from '@/AppContext';
import '@testing-library/jest-dom';
import { EXCHANGE_RATES } from '@/lib/listing-utils';

describe('PriceFilter', () => {
  it('shows "Any Price" by default', () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Any Price');
  });

  it('updates price range when preset is selected', () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Under ¥15M'));

    expect(screen.getByRole('button')).toHaveTextContent('Under ¥15M');
  });

  it('handles currency changes correctly', () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    // Open dropdown and select a price range in JPY
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Under ¥15M'));

    // Change currency to USD
    fireEvent.click(screen.getByLabelText('USD'));

    // Should show equivalent in USD
    expect(screen.getByRole('button')).toHaveTextContent('Under $100K');
  });

  it('resets filter when reset button is clicked', () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Under ¥15M'));
    fireEvent.click(screen.getByText('Reset Filter'));

    expect(screen.getByRole('button')).toHaveTextContent('Any Price');
  });

  it('maintains selected range when currency changes', async () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    // Select USD and a price range
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByLabelText('USD'));
    fireEvent.click(screen.getByText('$100K-$200K'));

    // Change to AUD
    fireEvent.click(screen.getByLabelText('AUD'));

    // Should show equivalent AUD range
    expect(screen.getByRole('button')).toHaveTextContent('A$150K-$300K');
  });

  it('maintains selected range index across multiple currency changes', async () => {
    render(
      <AppProvider>
        <PriceFilter />
      </AppProvider>
    );

    // Select second range in USD
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByLabelText('USD'));
    fireEvent.click(screen.getByText('$100K-$200K'));

    // Change to AUD then back to USD
    fireEvent.click(screen.getByLabelText('AUD'));
    fireEvent.click(screen.getByLabelText('USD'));

    // Should still show the second range in USD
    expect(screen.getByRole('button')).toHaveTextContent('$100K-$200K');
  });
}); 