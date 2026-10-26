export type QuoteSide = 'buy' | 'sell';

export interface QuoteRequest {
  symbol: string;
  side: QuoteSide;
  amount?: string;
}

export interface Quote {
  quote_id: string;
  symbol: string;
  side?: QuoteSide;
  amount?: string | null;
  bid: string;
  ask: string;
  mid: string;
  spread_bps: string;
  issued_at: string;
  expires_at: string;
}

export type QuoteResponse = Quote | { quote: Quote };
