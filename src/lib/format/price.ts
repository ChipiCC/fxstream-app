import type { RateTick } from '@/features/rates/types';

import { decimalPlaces, midPrice } from './decimal';

const integerFormatter = new Intl.NumberFormat('en-US', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const pricePattern = /^([+-]?)(\d+)(?:\.(\d+))?$/;

export function inferDecimals(value: string): number {
  return decimalPlaces(value);
}

export function formatPrice(
  value: string | null | undefined,
  decimals = value ? inferDecimals(value) : 2,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const match = pricePattern.exec(value.trim());
  if (!match) {
    return value;
  }

  const sign = match[1] === '-' ? '-' : '';
  const integer = match[2] ?? '0';
  const fraction = match[3] ?? '';
  const precision = Math.max(0, decimals);
  const groupedInteger = integerFormatter.format(BigInt(integer));
  const groupedFraction =
    precision > 0 ? `.${fraction.padEnd(precision, '0').slice(0, precision)}` : '';

  return `${sign}${groupedInteger}${groupedFraction}`;
}

export function displayPrice(
  tick: Pick<RateTick, 'bid' | 'ask' | 'last'>,
  fallback: string,
): string {
  if (tick.last) {
    return tick.last;
  }
  if (tick.bid && tick.ask) {
    return midPrice(tick.bid, tick.ask);
  }
  return fallback;
}

export function formatChangePercent(value: string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numeric = Number.parseFloat(value);
  if (numeric === 0) {
    return `0.${'0'.repeat(decimals)}%`;
  }

  const negative = value.trim().startsWith('-');
  const magnitude = negative ? value.trim().slice(1) : value.trim().replace(/^\+/, '');
  return `${negative ? '-' : '+'}${formatPrice(magnitude, decimals)}%`;
}

export function changeDirection(value: string | null | undefined): 'up' | 'down' | 'flat' {
  if (!value) {
    return 'flat';
  }
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric) || numeric === 0) {
    return 'flat';
  }
  return numeric > 0 ? 'up' : 'down';
}
