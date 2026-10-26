import type { ConnectionState, RateTick } from '@/features/rates/types';

import { computeBackoffDelay, type BackoffOptions } from './backoff';
import { parseServerMessageFromEvent, type ParseResult, type SubscribeMessage } from './protocol';

export interface WebSocketLike {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface RatesSocketOptions {
  url: string;
  onTick: (tick: RateTick) => void;
  onStateChange: (state: ConnectionState) => void;
  onOpen?: () => void;
  onProtocolError?: (failure: Extract<ParseResult, { ok: false }>) => void;
  reconnect: BackoffOptions & {
    offlineAfterAttempts: number;
    heartbeatTimeoutMs: number;
    stableConnectionMs: number;
  };
  webSocketFactory?: WebSocketFactory;
  random?: () => number;
  now?: () => number;
  isBrowserOnline?: () => boolean;
  setTimeoutFn?: (handler: () => void, timeout: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

const OPEN = 1;
const CLOSED = 3;

export class RatesSocketClient {
  private socket: WebSocketLike | null = null;
  private symbols = new Set<string>();
  private state: ConnectionState = 'offline';
  private attempt = 0;
  private manuallyClosed = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private stableConnectionTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityAt = 0;
  private readonly options: RatesSocketOptions;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly isBrowserOnline: () => boolean;
  private readonly setTimeoutFn: NonNullable<RatesSocketOptions['setTimeoutFn']>;
  private readonly clearTimeoutFn: NonNullable<RatesSocketOptions['clearTimeoutFn']>;
  private readonly handleOnline = (): void => {
    if (this.manuallyClosed) {
      return;
    }
    this.cancelReconnect();
    this.attempt = 0;
    this.open();
  };
  private readonly handleOffline = (): void => {
    this.cancelReconnect();
    this.stopHeartbeat();
    this.stopStableConnectionTimer();
    this.closeSocket();
    this.setState('offline');
  };

  constructor(options: RatesSocketOptions) {
    this.options = options;
    this.webSocketFactory =
      options.webSocketFactory ?? ((url) => new WebSocket(url) as unknown as WebSocketLike);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.isBrowserOnline =
      options.isBrowserOnline ??
      (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    this.setTimeoutFn =
      options.setTimeoutFn ?? ((handler, timeout) => setTimeout(handler, timeout));
    this.clearTimeoutFn = options.clearTimeoutFn ?? ((handle) => clearTimeout(handle));
  }

  connect(): void {
    if (!this.manuallyClosed) {
      return;
    }
    this.manuallyClosed = false;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
    if (!this.isBrowserOnline()) {
      this.setState('offline');
      this.scheduleReconnect();
      return;
    }
    this.open();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.cancelReconnect();
    this.stopHeartbeat();
    this.stopStableConnectionTimer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.closeSocket();
    this.setState('offline');
  }

  setSymbols(symbols: string[]): void {
    const next = new Set(symbols);
    const added = [...next].filter((symbol) => !this.symbols.has(symbol));
    const removed = [...this.symbols].filter((symbol) => !next.has(symbol));
    this.symbols = next;

    if (this.socket?.readyState !== OPEN) {
      return;
    }
    if (added.length > 0) {
      this.send({ action: 'subscribe', symbols: added });
    }
    if (removed.length > 0) {
      this.send({ action: 'unsubscribe', symbols: removed });
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  private open(): void {
    if (this.manuallyClosed) {
      return;
    }

    this.stopHeartbeat();
    this.stopStableConnectionTimer();
    this.closeSocket();
    this.setState('connecting');

    let socket: WebSocketLike;
    try {
      socket = this.webSocketFactory(this.options.url);
    } catch {
      this.handleDisconnected();
      return;
    }

    this.socket = socket;
    const isCurrentSocket = (): boolean => this.socket === socket;

    socket.onopen = () => {
      if (!isCurrentSocket()) {
        return;
      }
      this.lastActivityAt = this.now();
      this.setState('live');
      if (this.symbols.size > 0) {
        this.send({ action: 'subscribe', symbols: [...this.symbols] });
      }
      this.startHeartbeat();
      this.startStableConnectionTimer();
      this.options.onOpen?.();
    };

    socket.onmessage = (event) => {
      if (!isCurrentSocket()) {
        return;
      }
      const result = parseServerMessageFromEvent(event.data);
      if (result === null) {
        return;
      }
      if (!result.ok) {
        this.options.onProtocolError?.(result);
        return;
      }
      this.lastActivityAt = this.now();
      if (result.message.type === 'tick') {
        this.options.onTick({
          symbol: result.message.symbol,
          bid: result.message.bid,
          ask: result.message.ask,
          last: result.message.last,
          source: result.message.source,
          as_of: result.message.as_of,
          stale: result.message.stale,
        });
      }
    };

    socket.onerror = () => {
      if (!isCurrentSocket()) {
        return;
      }
      if (socket.readyState !== CLOSED) {
        socket.close();
      }
    };

    socket.onclose = () => {
      if (!isCurrentSocket()) {
        return;
      }
      this.handleDisconnected();
    };
  }

  private send(message: SubscribeMessage): void {
    if (this.socket?.readyState !== OPEN) {
      return;
    }
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      this.handleDisconnected();
    }
  }

  private handleDisconnected(): void {
    this.stopHeartbeat();
    this.stopStableConnectionTimer();
    this.socket = null;
    if (this.manuallyClosed) {
      this.setState('offline');
      return;
    }

    this.attempt += 1;
    const offline =
      !this.isBrowserOnline() || this.attempt >= this.options.reconnect.offlineAfterAttempts;
    this.setState(offline ? 'offline' : 'reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed || this.reconnectTimer !== null) {
      return;
    }
    const delay = computeBackoffDelay(this.attempt, this.options.reconnect, this.random);
    this.reconnectTimer = this.setTimeoutFn(() => {
      this.reconnectTimer = null;
      if (this.manuallyClosed) {
        return;
      }
      this.open();
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      this.clearTimeoutFn(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const checkEvery = Math.max(1_000, Math.floor(this.options.reconnect.heartbeatTimeoutMs / 2));
    const check = (): void => {
      this.heartbeatTimer = null;
      if (this.socket?.readyState !== OPEN) {
        return;
      }
      if (this.now() - this.lastActivityAt >= this.options.reconnect.heartbeatTimeoutMs) {
        const socket = this.socket;
        this.handleDisconnected();
        socket?.close();
        return;
      }
      this.heartbeatTimer = this.setTimeoutFn(check, checkEvery);
    };
    this.heartbeatTimer = this.setTimeoutFn(check, checkEvery);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      this.clearTimeoutFn(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startStableConnectionTimer(): void {
    this.stopStableConnectionTimer();
    this.stableConnectionTimer = this.setTimeoutFn(() => {
      this.stableConnectionTimer = null;
      this.attempt = 0;
    }, this.options.reconnect.stableConnectionMs);
  }

  private stopStableConnectionTimer(): void {
    if (this.stableConnectionTimer !== null) {
      this.clearTimeoutFn(this.stableConnectionTimer);
      this.stableConnectionTimer = null;
    }
  }

  private closeSocket(): void {
    const socket = this.socket;
    if (!socket) {
      return;
    }
    this.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    if (socket.readyState === OPEN || socket.readyState === 0) {
      socket.close();
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.options.onStateChange(state);
  }
}
