let serverOffsetMs = 0;
let lastSyncedAt: number | null = null;
let monotonicAnchor: { serverMs: number; performanceMs: number } | null = null;

function monotonicNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Estimate the server clock offset using the midpoint of a request/response
 * round trip. The midpoint removes the worst-case one-way latency bias.
 */
export function syncServerClock(
  issuedAt: string,
  requestStartedAt: number,
  responseReceivedAt: number,
): number {
  const issuedAtMs = Date.parse(issuedAt);
  if (Number.isNaN(issuedAtMs)) {
    return serverOffsetMs;
  }

  const midpoint = requestStartedAt + (responseReceivedAt - requestStartedAt) / 2;
  serverOffsetMs = issuedAtMs - midpoint;
  lastSyncedAt = responseReceivedAt;
  monotonicAnchor = {
    serverMs: responseReceivedAt + serverOffsetMs,
    performanceMs: monotonicNow(),
  };
  return serverOffsetMs;
}

export function getServerOffsetMs(): number {
  return serverOffsetMs;
}

/**
 * Server time anchored to the monotonic clock, so a system clock change does
 * not extend or shorten a quote's countdown.
 */
export function getServerNow(): number {
  if (monotonicAnchor) {
    return monotonicAnchor.serverMs + (monotonicNow() - monotonicAnchor.performanceMs);
  }
  return Date.now() + serverOffsetMs;
}

export function getLastClockSyncAt(): number | null {
  return lastSyncedAt;
}

export function resetServerClock(): void {
  serverOffsetMs = 0;
  lastSyncedAt = null;
  monotonicAnchor = null;
}
