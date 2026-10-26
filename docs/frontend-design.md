# FXStream Web: High-Level Frontend Design

## 1. Goal

A single-page React application that displays live FX and crypto prices, charts historical candles, and lets the user request a quote with a visible expiry countdown. It consumes the FXStream API over REST and WebSocket and must handle stale data, disconnections, and expired quotes clearly.

## 2. Scope

### In scope

- Live rates table with price change indicators.
- Candle chart for a selected pair and interval.
- Quote request panel with bid, ask, and countdown to expiry.
- Provider status indicator.
- Connection status and stale-data visualization.

### Out of scope (for now)

- User accounts, login, and portfolio views.
- Order execution or fund movement.
- Mobile-native apps (the layout is responsive, but no native build).

## 3. Pages and Routes

| Route                | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `/`                  | Live rates dashboard: table of pairs, selected pair chart, quote panel |
| `/pair/:base/:quote` | Deep link to a pair with its chart and quote panel open                |
| `/status`            | Provider health and connection diagnostics                             |
| `*`                  | Not found                                                              |

The dashboard is the main screen. `/status` is useful in a demo because it shows the resilience work on the backend.

## 4. Component Architecture

```text
App
├── AppShell (header, connection badge, navigation)
├── DashboardPage
│   ├── RatesTable
│   │   └── RateRow (price, change indicator, stale badge)
│   ├── PairChart (candles, interval selector)
│   └── QuotePanel
│       ├── QuoteForm (pair, side, amount)
│       └── QuoteCard (bid, ask, mid, countdown)
├── PairPage (reuses DashboardPage layout with route param)
└── StatusPage
    └── ProviderStatusList
```

Presentational components receive data through props and stay free of fetching logic. Containers handle data access.

## 5. Data and State Management

Each data source has a specific owner, so there is no single global store for everything.

| Data                                       | Source                   | Tool                                         |
| ------------------------------------------ | ------------------------ | -------------------------------------------- |
| Initial snapshot, candles, provider status | REST                     | TanStack Query (caching, retries, refetch)   |
| Live ticks                                 | WebSocket                | Dedicated live store (for example, Zustand)  |
| Quote                                      | REST (`POST /v1/quotes`) | Local component state plus a countdown timer |
| Connection status                          | WebSocket hook           | Live store                                   |

Live tick flow:

1. The `useRatesSocket` hook opens the connection and subscribes to the symbols on screen.
2. Each tick is written to the live store, keyed by symbol.
3. Components subscribe only to the symbols they render, so an update to BTC/USDT does not re-render the EUR/USD row.
4. Writes are batched per animation frame so high-frequency crypto ticks do not cause excessive renders.

Quote flow:

1. The user submits the quote form.
2. The app calls `POST /v1/quotes` and stores the response locally.
3. A countdown is computed from `expires_at` against the server clock offset, not the local clock alone.
4. When the countdown reaches zero, the quote is marked expired and the action is disabled. The user must request a new quote.

## 6. Real-Time Connection Handling

- Reconnection: exponential backoff with jitter, capped at a maximum delay.
- Resubscription: after reconnecting, the hook resends the active subscriptions automatically.
- Connection states: connecting, live, reconnecting, offline. These are shown in the header badge.
- Stale data: if a rate is flagged stale, its row shows a warning badge and the quote button for that pair is disabled.
- Heartbeat fallback: if no message arrives within a threshold, the UI shows reconnecting even if the socket is technically open.

## 7. UX States

Every data-driven view defines these states explicitly:

- Loading: skeleton rows or placeholder chart.
- Empty: no pairs subscribed or no candles returned.
- Error: message with a retry action (REST failures, quote rejected).
- Degraded: stale data or a provider marked degraded. Shown as a banner or badge, never hidden.
- Offline: full-width banner indicating live updates are paused, with the last known values still visible and labeled.

Quote rejections from the API (for example, stale base price) show the server's error reason in plain language.

## 8. Charting

- Library: `lightweight-charts` (TradingView), suited to financial candle data.
- Interval selector: 1m by default, with options for 5m and 1h if the backend supports them.
- Live candle update: the latest candle is updated from ticks, so the chart moves without refetching.
- Historical candles come from REST on pair selection; the chart is re-initialized when the pair changes.

## 9. Formatting and Precision

- Prices arrive as strings and are displayed with formatting helpers (`Intl.NumberFormat`) that respect each pair's decimal places.
- No floating-point arithmetic for prices in the frontend. Display formatting only.
- Time is shown in the user's local timezone, with the UTC value available on hover for quotes and ticks.

## 10. Project Structure

```text
fxstream-web/
├── src/
│   ├── app/            # providers, router, layout
│   ├── features/
│   │   ├── rates/      # table, rows, live store, socket hook
│   │   ├── chart/      # candle chart and interval selector
│   │   ├── quotes/     # form, card, countdown
│   │   └── status/     # provider status
│   ├── lib/
│   │   ├── api/        # typed REST client
│   │   ├── ws/         # socket client with reconnection
│   │   └── format/     # number, price, time formatting
│   ├── components/     # shared UI primitives
│   └── test/           # test utilities and mocks
├── e2e/                # end-to-end tests
└── vite.config.ts
```

Organizing by feature keeps the rates, chart, and quote logic separated, which matches the backend's module boundaries.

## 11. Tooling

- Build: Vite, React, TypeScript in strict mode.
- Styling: Tailwind CSS or CSS Modules, with a small set of shared UI primitives.
- Data: TanStack Query for REST, Zustand for live state.
- Routing: React Router.
- Testing:
  - Unit and component: Vitest with React Testing Library.
  - Socket hook: mocked WebSocket to test reconnection and resubscription.
  - Countdown: fake timers.
  - End-to-end: Playwright against a mocked backend or the Docker Compose stack.
- Quality: ESLint, Prettier, and a CI step that runs type checking and tests.

## 12. API Client and Type Safety

- Types are generated from the backend's OpenAPI schema, so the frontend contract stays in sync with the FastAPI models.
- A single REST client module wraps `fetch`, parses errors into a common shape, and is the only place that knows the base URL.
- WebSocket message types are defined as a discriminated union on `type`, so unknown message types are handled explicitly instead of silently ignored.

## 13. Configuration

- `VITE_API_BASE_URL` and `VITE_WS_URL` as environment variables.
- Default symbol list and interval defined in configuration, not hardcoded in components.

## 14. Testing Priorities

1. The socket hook: reconnection, resubscription, and state transitions.
2. The quote countdown and expiry behavior.
3. Rendering of stale, degraded, and offline states.
4. A smoke e2e test: load the dashboard, see live rows update, request a quote.

## 15. Deployment

- Static build deployed to Vercel.
- Environment variables set per environment (local, staging, production).
- A preview deployment per pull request for review.

## 16. Open Questions

- Should the chart support drawing tools, or is a clean candle chart enough for the portfolio?
- Is a dark theme required? It is the usual expectation for trading-style UIs.
- Should the quote panel allow multiple simultaneous quotes, or only one active at a time?
- Will the UI support languages other than English and Spanish, or is i18n out of scope?
