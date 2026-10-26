import { describe, expect, it } from 'vitest';

import { countdownProgress, formatCountdown } from '@/lib/format/countdown';

describe('countdown formatting', () => {
  it('formats minute and hour countdowns', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(999)).toBe('0:01');
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(3_600_000)).toBe('1:00:00');
    expect(formatCountdown(3_665_000)).toBe('1:01:05');
  });

  it('clamps progress to the valid range', () => {
    expect(countdownProgress(5_000, 10_000)).toBe(0.5);
    expect(countdownProgress(-1, 10_000)).toBe(0);
    expect(countdownProgress(20_000, 10_000)).toBe(1);
    expect(countdownProgress(1, 0)).toBe(0);
  });
});
