export interface SubscribeMessage {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

export interface TickMessage {
  type: 'tick';
  symbol: string;
  bid: string;
  ask: string;
  last?: string;
  source: string;
  as_of: string;
  stale: boolean;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  as_of?: string;
}

export type ServerMessage = TickMessage | HeartbeatMessage;

export type ParseFailureReason = 'invalid_json' | 'invalid_payload' | 'unknown_type';

export type ParseResult =
  { ok: true; message: ServerMessage } | { ok: false; reason: ParseFailureReason; raw: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTickMessage(
  value: Record<string, unknown>,
): value is Record<string, unknown> & TickMessage {
  return (
    isNonEmptyString(value.symbol) &&
    isNonEmptyString(value.bid) &&
    isNonEmptyString(value.ask) &&
    (value.last === undefined || isNonEmptyString(value.last)) &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.as_of) &&
    typeof value.stale === 'boolean'
  );
}

export function parseServerMessage(input: unknown): ParseResult {
  let value: unknown = input;

  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, reason: 'invalid_json', raw: input };
    }
  }

  if (!isRecord(value) || !isNonEmptyString(value.type)) {
    return { ok: false, reason: 'invalid_payload', raw: value };
  }

  if (value.type === 'tick') {
    if (!isTickMessage(value)) {
      return { ok: false, reason: 'invalid_payload', raw: value };
    }
    return {
      ok: true,
      message: {
        type: 'tick',
        symbol: value.symbol,
        bid: value.bid,
        ask: value.ask,
        last: value.last,
        source: value.source,
        as_of: value.as_of,
        stale: value.stale,
      },
    };
  }

  if (value.type === 'heartbeat') {
    return {
      ok: true,
      message: {
        type: 'heartbeat',
        as_of: isNonEmptyString(value.as_of) ? value.as_of : undefined,
      },
    };
  }

  return { ok: false, reason: 'unknown_type', raw: value };
}

export function parseServerMessageFromEvent(data: unknown): ParseResult | null {
  if (typeof data === 'string') {
    return parseServerMessage(data);
  }
  if (isRecord(data)) {
    return parseServerMessage(data);
  }
  return null;
}
