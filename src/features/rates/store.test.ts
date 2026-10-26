import { beforeEach, describe, expect, it } from 'vitest';

import { flushPendingTicks, useLiveRatesStore } from '@/features/rates/store';

const eurTick = {
  symbol: 'EUR/USD',
  bid: '1.08740',
  ask: '1.08750',
  last: '1.08745',
  source: 'Frankfurter',
  as_of: '2026-10-26T12:00:00.000Z',
  stale: false,
};

const btcTick = {
  symbol: 'BTC/USDT',
  bid: '67245.00',
  ask: '67246.00',
  last: '67245.50',
  source: 'Binance',
  as_of: '2026-10-26T12:00:01.000Z',
  stale: false,
};

describe('live rates store', () => {
  beforeEach(() => {
    useLiveRatesStore.getState().reset();
  });

  it('batches ticks and applies the latest value per symbol', () => {
    const store = useLiveRatesStore.getState();
    store.receiveTicks([eurTick, btcTick]);
    store.receiveTicks([{ ...eurTick, last: '1.08746' }]);

    expect(useLiveRatesStore.getState().ticks).toEqual({});

    flushPendingTicks();
    const state = useLiveRatesStore.getState();
    expect(state.ticks['EUR/USD']?.last).toBe('1.08746');
    expect(state.ticks['BTC/USDT']?.last).toBe('67245.50');
    expect(state.tickUpdatedAt['EUR/USD']).toBeTypeOf('number');
    expect(state.lastMessageAt).toBeTypeOf('number');
  });

  it('tracks connection state', () => {
    useLiveRatesStore.getState().setConnectionState('reconnecting');
    expect(useLiveRatesStore.getState().connectionState).toBe('reconnecting');
    useLiveRatesStore.getState().setConnectionState('live');
    expect(useLiveRatesStore.getState().connectionState).toBe('live');
  });

  it('reset clears ticks and pending batches', () => {
    useLiveRatesStore.getState().receiveTicks([eurTick]);
    useLiveRatesStore.getState().reset();
    flushPendingTicks();

    const state = useLiveRatesStore.getState();
    expect(state.ticks).toEqual({});
    expect(state.tickUpdatedAt).toEqual({});
    expect(state.connectionState).toBe('connecting');
    expect(state.lastMessageAt).toBeNull();
  });
});
