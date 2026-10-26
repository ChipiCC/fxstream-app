import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuoteCard } from '@/features/quotes/components/QuoteCard';
import type { Quote } from '@/features/quotes/types';

const quote: Quote = {
  quote_id: 'qt_test_quote',
  symbol: 'EUR/USD',
  side: 'buy',
  amount: '100',
  bid: '1.08740',
  ask: '1.08750',
  mid: '1.08745',
  spread_bps: '6.0',
  issued_at: '2026-10-26T12:00:00.000Z',
  expires_at: '2026-10-26T12:00:05.000Z',
};

describe('QuoteCard countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down and marks the quote expired', () => {
    render(<QuoteCard quote={quote} decimals={5} />);

    expect(screen.getByTestId('quote-card')).toHaveTextContent('Valid');
    expect(screen.getByTestId('quote-countdown')).toHaveTextContent('0:04');
    expect(screen.getByText('1.08745')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(screen.getByTestId('quote-countdown')).toHaveTextContent('0:02');

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByTestId('quote-countdown')).toHaveTextContent('Expired');
    expect(screen.getByTestId('quote-card')).toHaveTextContent('Expired');
    expect(screen.getByRole('status')).toHaveTextContent('The quote has expired');
  });
});
