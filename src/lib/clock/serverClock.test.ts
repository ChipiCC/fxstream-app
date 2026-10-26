import { afterEach, describe, expect, it } from 'vitest';

import {
  getLastClockSyncAt,
  getServerNow,
  getServerOffsetMs,
  resetServerClock,
  syncServerClock,
} from '@/lib/clock/serverClock';

describe('server clock', () => {
  afterEach(() => {
    resetServerClock();
  });

  it('estimates the offset from the response midpoint', () => {
    const startedAt = Date.parse('2026-10-26T12:00:00.000Z');
    const receivedAt = Date.parse('2026-10-26T12:00:02.000Z');
    const offset = syncServerClock('2026-10-26T12:00:10.000Z', startedAt, receivedAt);

    expect(offset).toBe(9_000);
    expect(getServerOffsetMs()).toBe(9_000);
    expect(getLastClockSyncAt()).toBe(receivedAt);
  });

  it('ignores invalid issued timestamps', () => {
    const offset = syncServerClock('not-a-date', 1_000, 2_000);
    expect(offset).toBe(0);
    expect(getLastClockSyncAt()).toBeNull();
  });

  it('returns a server now shifted by the estimated offset', () => {
    const localNow = Date.now();
    syncServerClock(new Date(localNow + 5_000).toISOString(), localNow, localNow);
    expect(getServerNow()).toBeGreaterThanOrEqual(localNow + 4_995);
  });
});
