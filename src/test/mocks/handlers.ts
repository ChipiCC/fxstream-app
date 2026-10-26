import { http, HttpResponse, ws } from 'msw';

import { appConfig } from '@/app/config';
import type { QuoteRequest } from '@/features/quotes/types';
import type { RateTick } from '@/features/rates/types';
import { CHART_INTERVALS, type ChartInterval } from '@/features/chart/types';

import {
  createMockQuote,
  getMockCandles,
  getMockProviderStatuses,
  getMockRates,
  isStaleRate,
  isValidSymbol,
  nextMockTick,
} from './market';
import { getMockScenario } from './scenario';

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

function getSymbolsFromRequest(request: Request): string[] {
  const raw = new URL(request.url).searchParams.get('symbols');
  if (!raw) {
    return [...appConfig.defaultSymbols];
  }
  return raw
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function isQuoteRequest(value: unknown): value is QuoteRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.symbol === 'string' &&
    (record.side === 'buy' || record.side === 'sell') &&
    (record.amount === undefined || typeof record.amount === 'string')
  );
}

function isChartInterval(value: string | null): value is ChartInterval {
  return value !== null && CHART_INTERVALS.includes(value as ChartInterval);
}

export const restHandlers = [
  http.get(`${appConfig.apiBaseUrl}/rates`, ({ request }) => {
    const scenario = getMockScenario();
    const symbols = getSymbolsFromRequest(request);
    return HttpResponse.json({ rates: getMockRates(symbols, scenario) });
  }),

  http.get(`${appConfig.apiBaseUrl}/rates/:base/:quote/candles`, ({ params, request }) => {
    const base = String(params.base ?? '').toUpperCase();
    const quote = String(params.quote ?? '').toUpperCase();
    const symbol = `${base}/${quote}`;
    if (!isValidSymbol(symbol)) {
      return errorResponse(404, 'not_found', `Unknown symbol ${symbol}.`);
    }

    const intervalParam = new URL(request.url).searchParams.get('interval') ?? '1m';
    if (!isChartInterval(intervalParam)) {
      return errorResponse(422, 'validation_error', `Unsupported interval ${intervalParam}.`);
    }

    const rawLimit = Number(new URL(request.url).searchParams.get('limit') ?? '180');
    const limit = Number.isFinite(rawLimit)
      ? Math.min(500, Math.max(1, Math.floor(rawLimit)))
      : 180;
    return HttpResponse.json({ candles: getMockCandles(symbol, intervalParam, limit) });
  }),

  http.post(`${appConfig.apiBaseUrl}/quotes`, async ({ request }) => {
    const rawBody: unknown = await request.json();
    if (!isQuoteRequest(rawBody)) {
      return errorResponse(422, 'validation_error', 'A valid symbol and side are required.');
    }

    const { symbol, side, amount } = rawBody;
    if (!isValidSymbol(symbol)) {
      return errorResponse(404, 'not_found', `Unknown symbol ${symbol}.`);
    }

    if (amount !== undefined && (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0)) {
      return errorResponse(422, 'validation_error', 'Amount must be a positive decimal string.');
    }

    const scenario = getMockScenario();
    if (scenario === 'quote-rejected' || isStaleRate(symbol, scenario)) {
      return errorResponse(
        409,
        'stale_price',
        `The base price for ${symbol} is stale. Wait for a fresh tick and request a new quote.`,
      );
    }

    return HttpResponse.json(
      { quote: createMockQuote(symbol, side, amount, scenario) },
      { status: 201 },
    );
  }),

  http.get(`${appConfig.apiBaseUrl}/providers/status`, () => {
    return HttpResponse.json({ providers: getMockProviderStatuses(getMockScenario()) });
  }),

  http.get(appConfig.apiHealthUrl, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.get(new URL('/health/live', appConfig.apiBaseUrl).toString(), () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

const ratesSocket = ws.link(appConfig.wsUrl);

function safeSend(client: { send: (data: string) => void }, payload: unknown): boolean {
  try {
    client.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export const wsHandlers = [
  ratesSocket.addEventListener('connection', ({ client }) => {
    const scenario = getMockScenario();

    if (scenario === 'offline') {
      client.close(1011, 'Simulated provider outage');
      return;
    }

    const symbols = new Set<string>();

    const emitTick = (symbol: string): void => {
      const tick = nextMockTick(symbol, scenario, Math.random);
      safeSend(client, { type: 'tick', ...tick } satisfies RateTick & { type: 'tick' });
    };

    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        return;
      }
      try {
        const message = JSON.parse(event.data) as {
          action?: string;
          symbols?: unknown;
        };
        if (
          (message.action !== 'subscribe' && message.action !== 'unsubscribe') ||
          !Array.isArray(message.symbols)
        ) {
          return;
        }
        const requested = message.symbols.filter(
          (symbol): symbol is string => typeof symbol === 'string' && isValidSymbol(symbol),
        );
        for (const symbol of requested) {
          if (message.action === 'subscribe') {
            symbols.add(symbol);
            emitTick(symbol);
          } else {
            symbols.delete(symbol);
          }
        }
      } catch {
        // Ignore malformed client messages in the mock transport.
      }
    };

    client.addEventListener('message', onMessage);

    const tickTimer = setInterval(() => {
      safeSend(client, { type: 'heartbeat', as_of: new Date().toISOString() });
      for (const symbol of symbols) {
        emitTick(symbol);
      }
    }, 1_000);

    client.addEventListener('close', () => {
      clearInterval(tickTimer);
    });
  }),
];

export const handlers = [...restHandlers, ...wsHandlers];
