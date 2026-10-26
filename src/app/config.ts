import { CHART_INTERVALS, type ChartInterval } from '@/features/chart/types';

const FALLBACK_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USDT', 'ETH/USDT'] as const;

const PAIR_DECIMALS: Record<string, number> = {
  'EUR/USD': 5,
  'GBP/USD': 5,
  'USD/JPY': 3,
  'BTC/USDT': 2,
  'ETH/USDT': 2,
};

const SYMBOL_PATTERN = /^[A-Z0-9]+\/[A-Z0-9]+$/;

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseUrl(
  value: string | undefined,
  fallback: string,
  protocols: string[],
  name: string,
): string {
  const raw = readEnv(value) ?? fallback;
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL. Received: ${raw}`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(' or ')}. Received: ${raw}`);
  }

  return raw.replace(/\/+$/, '');
}

function parseSymbols(value: string | undefined): string[] {
  const raw = readEnv(value);
  const symbols = (raw ? raw.split(',') : [...FALLBACK_SYMBOLS])
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    throw new Error('VITE_DEFAULT_SYMBOLS must contain at least one symbol.');
  }

  const invalid = symbols.filter((symbol) => !SYMBOL_PATTERN.test(symbol));
  if (invalid.length > 0) {
    throw new Error(`Invalid symbol(s): ${invalid.join(', ')}. Expected BASE/QUOTE.`);
  }

  return [...new Set(symbols)];
}

function parseInterval(value: string | undefined): ChartInterval {
  const raw = (readEnv(value)?.toLowerCase() ?? '1m') as ChartInterval;
  if (!CHART_INTERVALS.includes(raw)) {
    throw new Error(
      `VITE_DEFAULT_INTERVAL must be one of ${CHART_INTERVALS.join(', ')}. Received: ${raw}`,
    );
  }
  return raw;
}

const useMockApi = readEnv(import.meta.env.VITE_USE_MOCK_API)
  ? import.meta.env.VITE_USE_MOCK_API === 'true'
  : import.meta.env.DEV;

const apiBaseUrl = parseUrl(
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:8000/v1',
  ['http:', 'https:'],
  'VITE_API_BASE_URL',
);

const wsUrl = parseUrl(
  import.meta.env.VITE_WS_URL,
  'ws://localhost:8000/v1/ws/rates',
  ['ws:', 'wss:'],
  'VITE_WS_URL',
);

export const appConfig = Object.freeze({
  apiBaseUrl,
  apiHealthUrl: new URL('/health', apiBaseUrl).toString(),
  wsUrl,
  useMockApi,
  defaultSymbols: parseSymbols(import.meta.env.VITE_DEFAULT_SYMBOLS),
  defaultInterval: parseInterval(import.meta.env.VITE_DEFAULT_INTERVAL),
  pairDecimals: PAIR_DECIMALS,
  reconnect: {
    baseDelayMs: 500,
    maxDelayMs: 15_000,
    jitterRatio: 0.5,
    offlineAfterAttempts: 4,
    heartbeatTimeoutMs: 25_000,
    stableConnectionMs: 5_000,
  },
  ratesRefetchIntervalMs: 60_000,
  providerStatusRefetchIntervalMs: 15_000,
  healthRefetchIntervalMs: 15_000,
  quoteSafetyMarginMs: 1_000,
});

export function splitSymbol(symbol: string): { base: string; quote: string } {
  const [base, quote] = symbol.split('/');
  if (!base || !quote) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
  return { base, quote };
}

export function pairDecimals(symbol: string): number {
  return appConfig.pairDecimals[symbol] ?? 2;
}

export function isConfiguredSymbol(symbol: string): boolean {
  return appConfig.defaultSymbols.includes(symbol);
}
