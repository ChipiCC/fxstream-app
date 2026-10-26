import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { appConfig } from '@/app/config';
import { createQuote, getCandles, getHealth, getProviderStatus, getRates } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { server } from '@/test/mocks/server';

describe('API client', () => {
  it('loads rate snapshots with string prices', async () => {
    const rates = await getRates(['EUR/USD', 'BTC/USDT']);
    expect(rates).toHaveLength(2);
    expect(rates[0]?.symbol).toBe('EUR/USD');
    expect(rates[0]?.price).toBeTypeOf('string');
    expect(rates[0]?.decimals).toBe(5);
  });

  it('returns an empty list for unknown symbols', async () => {
    expect(await getRates(['NOPE/USD'])).toEqual([]);
  });

  it('loads and clamps candles', async () => {
    const candles = await getCandles('EUR/USD', '5m', 12);
    expect(candles).toHaveLength(12);
    expect(candles[0]?.interval).toBe('5m');
    expect(candles.every((candle) => typeof candle.close === 'string')).toBe(true);
  });

  it('creates a quote with an expiry', async () => {
    const quote = await createQuote({ symbol: 'EUR/USD', side: 'buy', amount: '100' });
    expect(quote.symbol).toBe('EUR/USD');
    expect(quote.quote_id).toMatch(/^qt_/);
    expect(Date.parse(quote.expires_at)).toBeGreaterThan(Date.parse(quote.issued_at));
    expect(quote.amount).toBe('100');
  });

  it('parses backend error envelopes into ApiError', async () => {
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

    await expect(createQuote({ symbol: 'EUR/USD', side: 'buy' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'stale_price',
      message: 'The base price is stale. Request a new quote.',
    });

    await expect(createQuote({ symbol: 'EUR/USD', side: 'buy' })).rejects.toBeInstanceOf(ApiError);
  });

  it('loads provider status and health', async () => {
    const providers = await getProviderStatus();
    expect(providers.map((provider) => provider.state)).toEqual(['up', 'up']);

    const health = await getHealth();
    expect(health.status).toBe('ok');
  });
});
