export const MOCK_SCENARIOS = [
  'normal',
  'stale',
  'degraded',
  'offline',
  'quote-rejected',
  'fast-expiry',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export const MOCK_SCENARIO_LABELS: Record<MockScenario, string> = {
  normal: 'Normal',
  stale: 'Stale rate',
  degraded: 'Degraded provider',
  offline: 'Offline feed',
  'quote-rejected': 'Quote rejected',
  'fast-expiry': 'Fast expiry',
};

export const MOCK_SCENARIO_DESCRIPTIONS: Record<MockScenario, string> = {
  normal: 'Live ticks, healthy providers, 30-second quotes.',
  stale: 'EUR/USD is stale and its quote action is disabled.',
  degraded: 'Providers report degraded health and one rate is stale.',
  offline: 'The WebSocket drops repeatedly, then settles into offline.',
  'quote-rejected': 'Quote requests fail with a stale-price error from the API.',
  'fast-expiry': 'Quotes expire after four seconds for an easy countdown test.',
};

export function getMockScenario(): MockScenario {
  if (typeof window === 'undefined') {
    return 'normal';
  }
  const value = new URLSearchParams(window.location.search).get('scenario');
  return MOCK_SCENARIOS.includes(value as MockScenario) ? (value as MockScenario) : 'normal';
}
