import { INTERVAL_SECONDS, type Candle, type ChartInterval } from '@/features/chart/types';
import type { Quote, QuoteSide } from '@/features/quotes/types';
import type { ProviderStatus, ProviderState } from '@/features/status/types';
import type { Rate, RateTick } from '@/features/rates/types';

import type { MockScenario } from './scenario';

interface MarketSeed {
  price: number;
  decimals: number;
  changePct: string;
  source: string;
  spreadBps: number;
  volatility: number;
}

const SEEDS: Record<string, MarketSeed> = {
  'EUR/USD': {
    price: 1.08742,
    decimals: 5,
    changePct: '0.12',
    source: 'Frankfurter',
    spreadBps: 6,
    volatility: 0.00004,
  },
  'GBP/USD': {
    price: 1.27135,
    decimals: 5,
    changePct: '-0.08',
    source: 'Frankfurter',
    spreadBps: 8,
    volatility: 0.00005,
  },
  'USD/JPY': {
    price: 157.842,
    decimals: 3,
    changePct: '0.31',
    source: 'Frankfurter',
    spreadBps: 7,
    volatility: 0.00004,
  },
  'BTC/USDT': {
    price: 67_245.1,
    decimals: 2,
    changePct: '2.41',
    source: 'Binance',
    spreadBps: 10,
    volatility: 0.00035,
  },
  'ETH/USDT': {
    price: 3_521.45,
    decimals: 2,
    changePct: '-1.08',
    source: 'Binance',
    spreadBps: 12,
    volatility: 0.00045,
  },
};

const currentPrices = new Map<string, number>(
  Object.entries(SEEDS).map(([symbol, seed]) => [symbol, seed.price]),
);

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function format(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function seedFor(symbol: string): MarketSeed {
  return SEEDS[symbol] ?? SEEDS['EUR/USD']!;
}

export function isStaleRate(symbol: string, scenario: MockScenario): boolean {
  return (scenario === 'stale' || scenario === 'degraded') && symbol === 'EUR/USD';
}

export function getCurrentPrice(symbol: string): number {
  return currentPrices.get(symbol) ?? seedFor(symbol).price;
}

export function getMockRates(symbols: string[], scenario: MockScenario): Rate[] {
  const now = new Date().toISOString();
  return symbols
    .filter((symbol) => symbol in SEEDS)
    .map((symbol) => {
      const seed = seedFor(symbol);
      const stale = isStaleRate(symbol, scenario);
      return {
        symbol,
        price: format(getCurrentPrice(symbol), seed.decimals),
        source: seed.source,
        as_of: stale ? new Date(Date.now() - 180_000).toISOString() : now,
        stale,
        change_pct: seed.changePct,
        decimals: seed.decimals,
      };
    });
}

export function nextMockTick(
  symbol: string,
  scenario: MockScenario,
  random: () => number,
): RateTick {
  const seed = seedFor(symbol);
  const current = getCurrentPrice(symbol);
  const direction = random() - 0.5;
  const nextPrice = Math.max(seed.price * 0.5, current * (1 + direction * seed.volatility * 2));
  currentPrices.set(symbol, nextPrice);

  const halfSpread = nextPrice * (seed.spreadBps / 20_000);
  const stale = isStaleRate(symbol, scenario);

  return {
    symbol,
    bid: format(nextPrice - halfSpread, seed.decimals),
    ask: format(nextPrice + halfSpread, seed.decimals),
    last: format(nextPrice, seed.decimals),
    source: seed.source,
    as_of: stale ? new Date(Date.now() - 180_000).toISOString() : new Date().toISOString(),
    stale,
  };
}

export function getMockCandles(symbol: string, interval: ChartInterval, limit: number): Candle[] {
  const seed = seedFor(symbol);
  const intervalSeconds = INTERVAL_SECONDS[interval];
  const nowSeconds = Math.floor(Date.now() / 1000);
  const endBucket = Math.floor(nowSeconds / intervalSeconds) * intervalSeconds;
  const random = mulberry32(hashString(`${symbol}:${interval}`));
  const target = getCurrentPrice(symbol);
  const candles: Candle[] = [];
  let previousClose = target * (0.985 + random() * 0.01);

  for (let index = 0; index < limit; index += 1) {
    const open = previousClose;
    const pullTowardTarget = (target - open) * ((index + 1) / limit) * 0.06;
    const close = Math.max(
      0.0001,
      open * (1 + (random() - 0.5) * seed.volatility * 5) + pullTowardTarget,
    );
    const high = Math.max(open, close) * (1 + random() * seed.volatility * 2);
    const low = Math.min(open, close) * (1 - random() * seed.volatility * 2);
    const openTime = endBucket - (limit - 1 - index) * intervalSeconds;

    candles.push({
      symbol,
      interval,
      open: format(open, seed.decimals),
      high: format(high, seed.decimals),
      low: format(low, seed.decimals),
      close: format(close, seed.decimals),
      volume: format(100 + random() * 900, 2),
      open_time: new Date(openTime * 1000).toISOString(),
    });
    previousClose = close;
  }

  const last = candles.at(-1);
  if (last) {
    last.close = format(target, seed.decimals);
    last.high = format(Math.max(Number(last.high), target), seed.decimals);
    last.low = format(Math.min(Number(last.low), target), seed.decimals);
  }

  return candles;
}

export function createMockQuote(
  symbol: string,
  side: QuoteSide,
  amount: string | undefined,
  scenario: MockScenario,
): Quote {
  const seed = seedFor(symbol);
  const price = getCurrentPrice(symbol);
  const halfSpread = price * (seed.spreadBps / 20_000);
  const now = Date.now();
  const ttlMs = scenario === 'fast-expiry' ? 4_000 : 30_000;

  return {
    quote_id: `qt_${crypto.randomUUID()}`,
    symbol,
    side,
    amount: amount ?? null,
    bid: format(price - halfSpread, seed.decimals),
    ask: format(price + halfSpread, seed.decimals),
    mid: format(price, seed.decimals),
    spread_bps: seed.spreadBps.toFixed(1),
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  };
}

export function getMockProviderStatuses(scenario: MockScenario): ProviderStatus[] {
  const now = Date.now();
  const degraded = scenario === 'degraded';
  const stale = scenario === 'stale';
  const stateFor = (provider: 'Binance' | 'Frankfurter'): ProviderState => {
    if (degraded) {
      return 'degraded';
    }
    if (stale && provider === 'Frankfurter') {
      return 'degraded';
    }
    return 'up';
  };

  return [
    {
      name: 'Binance',
      state: stateFor('Binance'),
      last_message_at: new Date(now - 1_200).toISOString(),
      reconnects: 0,
    },
    {
      name: 'Frankfurter',
      state: stateFor('Frankfurter'),
      last_message_at: new Date(now - (stale ? 3 * 60 * 60 * 1000 : 42_000)).toISOString(),
      reconnects: stale ? 3 : 1,
    },
  ];
}

export function isValidSymbol(symbol: string): boolean {
  return symbol in SEEDS;
}

export function resetMockMarket(): void {
  currentPrices.clear();
  for (const [symbol, seed] of Object.entries(SEEDS)) {
    currentPrices.set(symbol, seed.price);
  }
}
