import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { ConnectionState, LiveTick, RateTick } from './types';

interface LiveRatesState {
  ticks: Record<string, LiveTick>;
  tickUpdatedAt: Record<string, number>;
  connectionState: ConnectionState;
  lastMessageAt: number | null;
  receiveTicks: (ticks: RateTick[]) => void;
  setConnectionState: (state: ConnectionState) => void;
  reset: () => void;
}

const initialState = {
  ticks: {} as Record<string, LiveTick>,
  tickUpdatedAt: {} as Record<string, number>,
  connectionState: 'connecting' as ConnectionState,
  lastMessageAt: null as number | null,
};

let pendingTicks: RateTick[] = [];
let flushHandle: number | null = null;

function cancelScheduledFlush(): void {
  if (flushHandle === null) {
    return;
  }
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(flushHandle);
  } else if (typeof clearTimeout === 'function') {
    clearTimeout(flushHandle);
  }
  flushHandle = null;
}

function scheduleFlush(): void {
  if (flushHandle !== null) {
    return;
  }
  if (typeof requestAnimationFrame === 'function') {
    flushHandle = requestAnimationFrame(() => {
      flushHandle = null;
      flushPendingTicks();
    });
    return;
  }
  flushHandle = setTimeout(() => {
    flushHandle = null;
    flushPendingTicks();
  }, 16) as unknown as number;
}

export function flushPendingTicks(): void {
  cancelScheduledFlush();
  if (pendingTicks.length === 0) {
    return;
  }

  const batch = pendingTicks;
  pendingTicks = [];
  const receivedAt = Date.now();

  useLiveRatesStore.setState((state) => {
    const ticks = { ...state.ticks };
    const tickUpdatedAt = { ...state.tickUpdatedAt };

    for (const tick of batch) {
      ticks[tick.symbol] = { ...tick, receivedAt };
      tickUpdatedAt[tick.symbol] = receivedAt;
    }

    return { ticks, tickUpdatedAt, lastMessageAt: receivedAt };
  });
}

export const useLiveRatesStore = create<LiveRatesState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    receiveTicks: (ticks) => {
      if (ticks.length === 0) {
        return;
      }
      pendingTicks.push(...ticks);
      scheduleFlush();
    },
    setConnectionState: (connectionState) => set({ connectionState }),
    reset: () => {
      pendingTicks = [];
      cancelScheduledFlush();
      set({ ...initialState, ticks: {}, tickUpdatedAt: {} });
    },
  })),
);
