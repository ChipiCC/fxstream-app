export const queryKeys = {
  ratesRoot: ['rates'] as const,
  rates: (symbols: string[]) => ['rates', [...symbols].sort().join(',')] as const,
  candlesRoot: ['candles'] as const,
  candles: (symbol: string, interval: string) => ['candles', symbol, interval] as const,
  providers: ['providers'] as const,
  health: ['health'] as const,
  quote: (quoteId: string) => ['quote', quoteId] as const,
};
