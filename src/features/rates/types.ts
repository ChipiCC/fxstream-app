export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface Rate {
  symbol: string;
  price: string;
  source: string;
  as_of: string;
  stale: boolean;
  change_pct?: string | null;
  decimals?: number;
}

export interface RateTick {
  symbol: string;
  bid: string;
  ask: string;
  last?: string;
  source: string;
  as_of: string;
  stale: boolean;
}

export interface LiveTick extends RateTick {
  receivedAt: number;
}

export type RatesResponse = Rate[] | { rates: Rate[] };
