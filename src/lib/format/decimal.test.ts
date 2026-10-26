import { describe, expect, it } from 'vitest';

import { compareDecimal, decimalPlaces, midPrice, normalizeDecimal } from '@/lib/format/decimal';

describe('decimal helpers', () => {
  it('computes an exact midpoint without floating point arithmetic', () => {
    expect(midPrice('1.08740', '1.08750')).toBe('1.08745');
    expect(midPrice('1.08', '1.085')).toBe('1.0825');
    expect(midPrice('0.1', '0.2')).toBe('0.15');
  });

  it('counts decimal places and normalizes strings', () => {
    expect(decimalPlaces('1.08742')).toBe(5);
    expect(decimalPlaces('100')).toBe(0);
    expect(normalizeDecimal('+001.20')).toBe('1.20');
    expect(normalizeDecimal('not-a-number')).toBeNull();
  });

  it('compares values at different scales', () => {
    expect(compareDecimal('1.08742', '1.0874')).toBe(1);
    expect(compareDecimal('1.08740', '1.0874')).toBe(0);
    expect(compareDecimal('0.99', '1.0')).toBe(-1);
    expect(compareDecimal('bad', '1')).toBeNull();
  });
});
