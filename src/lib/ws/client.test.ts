import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { ConnectionState } from '@/features/rates/types';
import { RatesSocketClient, type WebSocketLike, type WebSocketFactory } from '@/lib/ws/client';

class FakeSocket implements WebSocketLike {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === 3) {
      return;
    }
    this.readyState = 3;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
  }
}

interface Harness {
  sockets: FakeSocket[];
  factory: WebSocketFactory;
}

function createHarness(): Harness {
  const sockets: FakeSocket[] = [];
  return {
    sockets,
    factory: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  };
}

function parseMessages(socket: FakeSocket): Array<{ action: string; symbols: string[] }> {
  return socket.sent.map((entry) => JSON.parse(entry) as { action: string; symbols: string[] });
}

type StateMock = Mock<(state: ConnectionState) => void>;

function latestState(states: StateMock): ConnectionState | undefined {
  return states.mock.calls.at(-1)?.[0];
}

describe('RatesSocketClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createClient(
    overrides: Partial<ConstructorParameters<typeof RatesSocketClient>[0]> = {},
  ) {
    const harness = createHarness();
    const onTick = vi.fn();
    const onStateChange: StateMock = vi.fn<(state: ConnectionState) => void>();
    const client = new RatesSocketClient({
      url: 'ws://localhost:8000/v1/ws/rates',
      onTick,
      onStateChange,
      reconnect: {
        baseDelayMs: 500,
        maxDelayMs: 15_000,
        jitterRatio: 0,
        offlineAfterAttempts: 2,
        heartbeatTimeoutMs: 2_000,
        stableConnectionMs: 5_000,
      },
      webSocketFactory: harness.factory,
      random: () => 0,
      isBrowserOnline: () => true,
      ...overrides,
    });
    return { client, harness, onTick, onStateChange };
  }

  it('connects, reports live, and subscribes to active symbols', () => {
    const { client, harness, onStateChange } = createClient();
    client.setSymbols(['EUR/USD', 'BTC/USDT']);
    client.connect();

    expect(harness.sockets).toHaveLength(1);
    expect(latestState(onStateChange)).toBe('connecting');

    harness.sockets[0]!.open();
    expect(latestState(onStateChange)).toBe('live');
    expect(parseMessages(harness.sockets[0]!)).toEqual([
      { action: 'subscribe', symbols: ['EUR/USD', 'BTC/USDT'] },
    ]);

    client.disconnect();
    expect(latestState(onStateChange)).toBe('offline');
  });

  it('resubscribes to all symbols after reconnecting', () => {
    const { client, harness, onStateChange } = createClient();
    client.setSymbols(['EUR/USD']);
    client.connect();
    harness.sockets[0]!.open();

    harness.sockets[0]!.close();
    expect(latestState(onStateChange)).toBe('reconnecting');

    vi.advanceTimersByTime(500);
    expect(harness.sockets).toHaveLength(2);
    harness.sockets[1]!.open();

    expect(parseMessages(harness.sockets[1]!)).toEqual([
      { action: 'subscribe', symbols: ['EUR/USD'] },
    ]);
    client.disconnect();
  });

  it('diffs subscriptions while the socket is open', () => {
    const { client, harness } = createClient();
    client.setSymbols(['EUR/USD']);
    client.connect();
    harness.sockets[0]!.open();

    client.setSymbols(['EUR/USD', 'BTC/USDT']);
    client.setSymbols(['BTC/USDT']);

    expect(parseMessages(harness.sockets[0]!)).toEqual([
      { action: 'subscribe', symbols: ['EUR/USD'] },
      { action: 'subscribe', symbols: ['BTC/USDT'] },
      { action: 'unsubscribe', symbols: ['EUR/USD'] },
    ]);
    client.disconnect();
  });

  it('forwards ticks and ignores unknown messages explicitly', () => {
    const onTick = vi.fn();
    const onProtocolError = vi.fn();
    const { client, harness } = createClient({ onTick, onProtocolError });
    client.connect();
    harness.sockets[0]!.open();

    harness.sockets[0]!.receive({
      type: 'tick',
      symbol: 'EUR/USD',
      bid: '1.08740',
      ask: '1.08750',
      last: '1.08745',
      source: 'Frankfurter',
      as_of: '2026-10-26T12:00:00.000Z',
      stale: false,
    });
    harness.sockets[0]!.receive({ type: 'trade', symbol: 'EUR/USD' });

    expect(onTick).toHaveBeenCalledWith({
      symbol: 'EUR/USD',
      bid: '1.08740',
      ask: '1.08750',
      last: '1.08745',
      source: 'Frankfurter',
      as_of: '2026-10-26T12:00:00.000Z',
      stale: false,
    });
    expect(onProtocolError).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, reason: 'unknown_type' }),
    );
    client.disconnect();
  });

  it('enters offline after the configured failure threshold', () => {
    const { client, harness, onStateChange } = createClient();
    client.connect();
    harness.sockets[0]!.open();

    harness.sockets[0]!.close();
    expect(latestState(onStateChange)).toBe('reconnecting');

    vi.advanceTimersByTime(500);
    harness.sockets[1]!.open();
    harness.sockets[1]!.close();

    expect(latestState(onStateChange)).toBe('offline');
    client.disconnect();
  });

  it('uses the heartbeat fallback to reconnect a quiet socket', () => {
    const { client, harness, onStateChange } = createClient();
    client.connect();
    harness.sockets[0]!.open();

    vi.advanceTimersByTime(1_000);
    expect(latestState(onStateChange)).toBe('live');

    vi.advanceTimersByTime(1_000);
    expect(latestState(onStateChange)).toBe('reconnecting');
    expect(harness.sockets).toHaveLength(1);

    vi.advanceTimersByTime(500);
    expect(harness.sockets).toHaveLength(2);
    client.disconnect();
  });

  it('keeps a quiet socket alive when heartbeats arrive', () => {
    const { client, harness, onStateChange } = createClient();
    client.connect();
    harness.sockets[0]!.open();

    vi.advanceTimersByTime(1_500);
    harness.sockets[0]!.receive({ type: 'heartbeat' });
    vi.advanceTimersByTime(1_000);

    expect(latestState(onStateChange)).toBe('live');
    client.disconnect();
  });

  it('does not reconnect after a manual disconnect', () => {
    const { client, harness } = createClient();
    client.connect();
    harness.sockets[0]!.open();
    client.disconnect();

    vi.advanceTimersByTime(30_000);
    expect(harness.sockets).toHaveLength(1);
  });

  it('pauses while the browser is offline and resumes on online', () => {
    let online = true;
    const { client, harness, onStateChange } = createClient({
      isBrowserOnline: () => online,
    });
    client.connect();
    harness.sockets[0]!.open();

    online = false;
    window.dispatchEvent(new Event('offline'));
    expect(latestState(onStateChange)).toBe('offline');
    expect(harness.sockets[0]!.readyState).toBe(3);

    online = true;
    window.dispatchEvent(new Event('online'));
    expect(harness.sockets).toHaveLength(2);
    harness.sockets[1]!.open();
    expect(latestState(onStateChange)).toBe('live');
    client.disconnect();
  });
});
