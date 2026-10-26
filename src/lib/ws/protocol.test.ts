import { describe, expect, it } from 'vitest';

import { parseServerMessage } from '@/lib/ws/protocol';

const tick = {
  type: 'tick',
  symbol: 'EUR/USD',
  bid: '1.08740',
  ask: '1.08750',
  last: '1.08745',
  source: 'Frankfurter',
  as_of: '2026-10-26T12:00:00.000Z',
  stale: false,
};

describe('WebSocket protocol', () => {
  it('parses a valid tick', () => {
    expect(parseServerMessage(JSON.stringify(tick))).toEqual({ ok: true, message: tick });
  });

  it('parses heartbeats', () => {
    expect(parseServerMessage('{"type":"heartbeat"}')).toEqual({
      ok: true,
      message: { type: 'heartbeat', as_of: undefined },
    });
  });

  it('reports malformed JSON without throwing', () => {
    expect(parseServerMessage('{oops')).toMatchObject({ ok: false, reason: 'invalid_json' });
  });

  it('reports unknown message types explicitly', () => {
    expect(parseServerMessage('{"type":"trade","symbol":"EUR/USD"}')).toMatchObject({
      ok: false,
      reason: 'unknown_type',
    });
  });

  it('rejects ticks with missing fields', () => {
    const incomplete = {
      type: tick.type,
      symbol: tick.symbol,
      ask: tick.ask,
      last: tick.last,
      source: tick.source,
      as_of: tick.as_of,
      stale: tick.stale,
    };
    expect(parseServerMessage(JSON.stringify(incomplete))).toMatchObject({
      ok: false,
      reason: 'invalid_payload',
    });
  });

  it('rejects non-object payloads', () => {
    expect(parseServerMessage('42')).toMatchObject({ ok: false, reason: 'invalid_payload' });
  });
});
