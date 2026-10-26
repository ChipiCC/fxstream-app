import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { RatesTable } from '@/features/rates/components/RatesTable';
import type { Rate } from '@/features/rates/types';
import { renderWithProviders } from '@/test/render';

const rates: Rate[] = [
  {
    symbol: 'EUR/USD',
    price: '1.08742',
    source: 'Frankfurter',
    as_of: '2026-10-26T12:00:00.000Z',
    stale: false,
    change_pct: '0.12',
    decimals: 5,
  },
  {
    symbol: 'BTC/USDT',
    price: '67245.10',
    source: 'Binance',
    as_of: '2026-10-26T12:00:01.000Z',
    stale: false,
    change_pct: '2.41',
    decimals: 2,
  },
];

function renderTable(
  overrides: {
    rates?: Rate[];
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    onRetry?: () => void;
  } = {},
) {
  return renderWithProviders(
    <MemoryRouter>
      <RatesTable
        rates={overrides.rates ?? rates}
        isLoading={overrides.isLoading ?? false}
        isError={overrides.isError ?? false}
        error={overrides.error}
        onRetry={overrides.onRetry ?? (() => {})}
        selectedSymbol="EUR/USD"
      />
    </MemoryRouter>,
  );
}

describe('RatesTable states', () => {
  it('renders rows in configured order and marks the selected pair', () => {
    renderTable();
    expect(screen.getByTestId('rate-row-EUR-USD')).toHaveTextContent('EUR/USD');
    expect(screen.getByTestId('rate-row-BTC-USDT')).toHaveTextContent('BTC/USDT');
    expect(screen.getByTestId('rate-row-EUR-USD')).toHaveTextContent('selected');
  });

  it('shows an empty state when no rates are returned', () => {
    renderTable({ rates: [] });
    expect(screen.getByText('No rates available')).toBeInTheDocument();
  });

  it('shows an error with a retry action', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderTable({ isError: true, error: new Error('API unavailable'), onRetry });

    expect(screen.getByText('Could not load rates')).toBeInTheDocument();
    expect(screen.getByText('API unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders skeleton rows while loading', () => {
    renderTable({ isLoading: true });
    expect(screen.queryByText('Live rates')).toBeInTheDocument();
    expect(screen.queryByTestId('rate-row-EUR-USD')).not.toBeInTheDocument();
  });
});
