import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { appConfig } from '@/app/config';
import { QuotePanel } from '@/features/quotes/components/QuotePanel';
import { useLiveRatesStore } from '@/features/rates/store';
import type { Rate } from '@/features/rates/types';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';

const rate: Rate = {
  symbol: 'EUR/USD',
  price: '1.08742',
  source: 'Frankfurter',
  as_of: '2026-10-26T12:00:00.000Z',
  stale: false,
  change_pct: '0.12',
  decimals: 5,
};

function renderPanel(overrides: Partial<Rate> = {}) {
  return renderWithProviders(
    <MemoryRouter>
      <QuotePanel
        symbol="EUR/USD"
        rate={{ ...rate, ...overrides }}
        rateLoading={false}
        rateError={null}
      />
    </MemoryRouter>,
  );
}

describe('QuotePanel', () => {
  beforeEach(() => {
    useLiveRatesStore.getState().reset();
  });

  it('requests a quote and locks the form while it is active', async () => {
    const user = userEvent.setup();
    renderPanel();

    const submit = screen.getByTestId('quote-submit');
    expect(submit).toBeEnabled();
    await user.click(submit);

    await expect(screen.findByTestId('quote-card')).resolves.toBeInTheDocument();
    expect(screen.getByTestId('quote-countdown')).toBeInTheDocument();
    expect(screen.getByTestId('quote-submit')).toBeDisabled();
    expect(screen.getByTestId('quote-submit')).toHaveTextContent('Quote active');
  });

  it('disables quoting for stale rates', () => {
    renderPanel({ stale: true });

    expect(screen.getByTestId('quote-submit')).toBeDisabled();
    expect(screen.getByText('Quoting is disabled while this rate is stale.')).toBeInTheDocument();
  });

  it('shows the server rejection reason', async () => {
    server.use(
      http.post(`${appConfig.apiBaseUrl}/quotes`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'stale_price',
              message: 'The base price is stale. Request a new quote.',
            },
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('quote-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The base price is stale. Request a new quote.',
    );
    expect(screen.getByTestId('quote-submit')).toBeEnabled();
  });

  it('validates the optional amount before submitting', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByLabelText('Amount'), 'abc');
    await user.click(screen.getByTestId('quote-submit'));

    expect(screen.getByText('Enter a positive decimal amount.')).toBeInTheDocument();
    expect(screen.queryByTestId('quote-card')).not.toBeInTheDocument();
  });
});
