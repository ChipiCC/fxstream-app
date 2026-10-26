import { describe, expect, it } from 'vitest';

import {
  changeDirection,
  displayPrice,
  formatChangePercent,
  formatPrice,
  inferDecimals,
} from '@/lib/format/price';

describe('price formatting', () => {
  it('respects explicit precision and groups thousands', () => {
    expect(formatPrice('67245.1', 2)).toBe('67,245.10');
    expect(formatPrice('1.08742', 5)).toBe('1.08742');
    expect(formatPrice('157.842', 3)).toBe('157.842');
    expect(formatPrice('-0.5', 2)).toBe('-0.50');
    expect(formatPrice('1.08742', 2)).toBe('1.08');
  });

  it('infers precision from the string when none is given', () => {
    expect(inferDecimals('1.08742')).toBe(5);
    expect(formatPrice('1.08742')).toBe('1.08742');
  });

  it('handles missing values', () => {
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice('')).toBe('—');
    expect(formatPrice('abc')).toBe('abc');
  });

  it('uses last, midpoint, then fallback for a live tick', () => {
    expect(displayPrice({ bid: '1.0874', ask: '1.0875', last: '1.08745' }, '1')).toBe('1.08745');
    expect(displayPrice({ bid: '1.0874', ask: '1.0875' }, '1')).toBe('1.08745');
    expect(displayPrice({ bid: '', ask: '' }, '1.08742')).toBe('1.08742');
  });

  it('formats signed percentage changes', () => {
    expect(formatChangePercent('0.12')).toBe('+0.12%');
    expect(formatChangePercent('-1.08')).toBe('-1.08%');
    expect(formatChangePercent('+0.5')).toBe('+0.50%');
    expect(formatChangePercent('0')).toBe('0.00%');
    expect(formatChangePercent(undefined)).toBe('—');
    expect(changeDirection('0.12')).toBe('up');
    expect(changeDirection('-1.08')).toBe('down');
    expect(changeDirection('0')).toBe('flat');
  });
});
