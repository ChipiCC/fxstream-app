import { describe, expect, it } from 'vitest';

import { computeBackoffDelay } from '@/lib/ws/backoff';

const options = { baseDelayMs: 500, maxDelayMs: 15_000, jitterRatio: 0.5 };

describe('backoff', () => {
  it('grows exponentially from the base delay', () => {
    expect(computeBackoffDelay(1, options, () => 0)).toBe(500);
    expect(computeBackoffDelay(2, options, () => 0)).toBe(1_000);
    expect(computeBackoffDelay(3, options, () => 0)).toBe(2_000);
    expect(computeBackoffDelay(4, options, () => 0)).toBe(4_000);
  });

  it('adds bounded jitter', () => {
    expect(computeBackoffDelay(1, options, () => 1)).toBe(750);
    expect(computeBackoffDelay(2, options, () => 0.5)).toBe(1_250);
  });

  it('caps the delay', () => {
    expect(computeBackoffDelay(20, options, () => 0)).toBe(15_000);
    expect(computeBackoffDelay(20, options, () => 1)).toBe(15_000);
  });

  it('treats invalid attempts and random values defensively', () => {
    expect(computeBackoffDelay(0, options, () => 0)).toBe(500);
    expect(computeBackoffDelay(1, options, () => 2)).toBe(750);
    expect(computeBackoffDelay(1, options, () => -1)).toBe(500);
  });
});
