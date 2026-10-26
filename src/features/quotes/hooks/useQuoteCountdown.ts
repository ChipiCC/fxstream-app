import { appConfig } from '@/app/config';
import { getServerNow } from '@/lib/clock/serverClock';
import { useClockNow } from '@/lib/clock/useClockNow';

import type { Quote } from '../types';

export interface QuoteCountdown {
  remainingMs: number;
  totalMs: number;
  expired: boolean;
}

export function useQuoteCountdown(quote: Quote): QuoteCountdown {
  const now = useClockNow();
  const issuedAt = Date.parse(quote.issued_at);
  const expiresAt = Date.parse(quote.expires_at);

  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    return { remainingMs: 0, totalMs: 0, expired: true };
  }

  const totalMs = Math.max(0, expiresAt - issuedAt);
  // Keep the ticker subscribed so the countdown re-renders every 250ms, then
  // derive server time from the monotonic anchor.
  void now;
  const remainingMs = Math.max(0, expiresAt - getServerNow() - appConfig.quoteSafetyMarginMs);

  return {
    remainingMs,
    totalMs,
    expired: remainingMs <= 0,
  };
}
