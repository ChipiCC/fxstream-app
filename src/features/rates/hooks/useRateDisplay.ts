import { useLiveRatesStore } from '../store';
import type { Rate } from '../types';
import { pairDecimals } from '@/app/config';
import { displayPrice } from '@/lib/format/price';

export interface RateDisplay {
  symbol: string;
  price: string;
  asOf: string | undefined;
  source: string | undefined;
  changePct: string | null | undefined;
  stale: boolean;
  decimals: number;
  hasLiveTick: boolean;
}

export function useRateDisplay(symbol: string, snapshot: Rate | undefined): RateDisplay {
  const tick = useLiveRatesStore((state) => state.ticks[symbol]);
  const connectionState = useLiveRatesStore((state) => state.connectionState);

  const snapshotPrice = snapshot?.price ?? '';
  const price = tick ? displayPrice(tick, snapshotPrice) : snapshotPrice || '—';
  const stale = Boolean(tick?.stale ?? snapshot?.stale) || connectionState === 'offline';
  const decimals = snapshot?.decimals ?? pairDecimals(symbol);

  return {
    symbol,
    price,
    asOf: tick?.as_of ?? snapshot?.as_of,
    source: tick?.source ?? snapshot?.source,
    changePct: snapshot?.change_pct,
    stale,
    decimals,
    hasLiveTick: Boolean(tick),
  };
}
