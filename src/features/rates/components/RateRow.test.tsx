import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { RateRow } from '@/features/rates/components/RateRow';
import { flushPendingTicks, useLiveRatesStore } from '@/features/rates/store';
import type { Rate } from '@/features/rates/types';

const rate: Rate = {
  symbol: 'EUR/USD',
  price: '1.08742',
  source: 'Frankfurter',
  as_of: '2026-10-26T12:00:00.000Z',
  stale: false,
  change_pct: '0.12',
  decimals: 5,
};

function renderRow(overrides: Partial<Rate> = {}) {
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <RateRow rate={{ ...rate, ...overrides }} selected={false} />
        </tbody>
      </table>
    </MemoryRouter>,
  );
}

describe('RateRow', () => {
  beforeEach(() => {
    useLiveRatesStore.getState().reset();
  });

  it('renders the snapshot price, change, and pair link', () => {
    renderRow();

    expect(screen.getByTestId('price-EUR-USD')).toHaveTextContent('1.08742');
    expect(screen.getByTestId('change-EUR-USD')).toHaveTextContent('▲ +0.12%');
    expect(screen.getByRole('link').getAttribute('href')).toBe('/pair/EUR/USD');
  });

  it('prefers a live tick over the snapshot', () => {
    renderRow();

    act(() => {
      useLiveRatesStore.getState().receiveTicks([
        {
          symbol: 'EUR/USD',
          bid: '1.08840',
          ask: '1.08850',
          last: '1.08845',
          source: 'Frankfurter',
          as_of: '2026-10-26T12:00:02.000Z',
          stale: false,
        },
      ]);
      flushPendingTicks();
    });

    expect(screen.getByTestId('price-EUR-USD')).toHaveTextContent('1.08845');
  });

  it('shows a stale badge and preserves the last known price', () => {
    renderRow({ stale: true });
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByTestId('price-EUR-USD')).toHaveTextContent('1.08742');
  });
});
