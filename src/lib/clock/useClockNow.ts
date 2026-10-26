import { useSyncExternalStore } from 'react';

const TICK_MS = 250;

function subscribe(listener: () => void): () => void {
  const timer = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(timer);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

export function useClockNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
