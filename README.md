# FXStream Web

A single-page React terminal for live FX and crypto rates, historical candles, and short-lived
quotes. It consumes the FXStream REST and WebSocket contracts and keeps stale data, provider
degradation, quote expiry, and disconnections visible instead of hiding them.

The app is mock-first: it runs end-to-end against deterministic MSW fixtures today and switches to
the real API through environment variables only.

## Highlights

- Live rates table with per-symbol subscriptions and animation-frame batching.
- Candlestick chart with 1m / 5m / 1h intervals and live candle updates from ticks.
- Quote form with bid/ask/mid, server-clock countdown, expiry handling, and server error messages.
- Explicit loading, empty, error, stale, degraded, and offline states.
- Connection badge with `connecting`, `live`, `reconnecting`, and `offline` states.
- Reconnecting WebSocket client with exponential backoff, jitter, resubscription, and a heartbeat
  watchdog.
- Provider health page with connection diagnostics and mock scenario switches.
- Strict TypeScript, Vitest + Testing Library, and Playwright smoke tests.

## Stack

| Concern              | Choice                         |
| -------------------- | ------------------------------ |
| Build                | Vite, React, TypeScript strict |
| Styling              | Tailwind CSS v4                |
| Routing              | React Router                   |
| REST data            | TanStack Query                 |
| Live ticks           | Zustand                        |
| Chart                | `lightweight-charts`           |
| Mocks                | MSW REST + WebSocket           |
| Unit/component tests | Vitest + React Testing Library |
| End-to-end tests     | Playwright                     |
| Package manager      | Bun                            |
| Deployment           | Vercel static build            |

## Quick start

```bash
mise install       # Node 24 and Bun 1.4.3 from .mise.toml
bun install
cp .env.example .env.local
bun run dev        # http://localhost:5173
```

Mock mode is enabled by default in development, so no backend is required. Open
`http://localhost:5173/status` to switch between demo scenarios.

### Scripts

| Command                 | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `bun run dev`           | Vite dev server                                               |
| `bun run build`         | Type-check and build to `dist/`                               |
| `bun run preview`       | Preview the production build                                  |
| `bun run lint`          | ESLint                                                        |
| `bun run format`        | Prettier write                                                |
| `bun run format:check`  | Prettier check                                                |
| `bun run typecheck`     | `tsc -b`                                                      |
| `bun run test`          | Vitest watch mode                                             |
| `bun run test:run`      | Vitest once                                                   |
| `bun run test:coverage` | Coverage report                                               |
| `bun run e2e`           | Playwright against the dev server                             |
| `bun run check`         | Lint, format check, typecheck, tests, and build               |
| `bun run generate:api`  | Regenerate OpenAPI types (when the backend exposes FX routes) |

## Configuration

Public Vite variables live in [`.env.example`](.env.example):

| Variable                | Default                                     | Notes                                 |
| ----------------------- | ------------------------------------------- | ------------------------------------- |
| `VITE_API_BASE_URL`     | `http://localhost:8000/v1`                  | Base URL including the version prefix |
| `VITE_WS_URL`           | `ws://localhost:8000/v1/ws/rates`           | WebSocket endpoint                    |
| `VITE_USE_MOCK_API`     | `true` in development                       | Set `false` to use the real API       |
| `VITE_DEFAULT_SYMBOLS`  | `EUR/USD,GBP/USD,USD/JPY,BTC/USDT,ETH/USDT` | Comma-separated `BASE/QUOTE` symbols  |
| `VITE_DEFAULT_INTERVAL` | `1m`                                        | `1m`, `5m`, or `1h`                   |

`VITE_*` values are public in the browser bundle. Never put API keys or other secrets there. If the
backend enables API-key auth, add a same-origin proxy or BFF instead of embedding a key.

### Using a real backend

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://api.example.com/v1
VITE_WS_URL=wss://api.example.com/v1/ws/rates
```

The backend must allow the frontend origin through CORS and accept the WebSocket origin. The design
document uses `/v1`; the FastAPI template currently uses `/api/v1`, so set the base URL to whichever
prefix the deployed service exposes.

## Mock scenarios

Mock mode serves REST and WebSocket traffic from MSW. Scenario selection is read from the URL:

| URL                         | What it demonstrates                         |
| --------------------------- | -------------------------------------------- |
| `/?scenario=normal`         | Healthy providers, live ticks, 30s quotes    |
| `/?scenario=stale`          | EUR/USD stale, quote action disabled         |
| `/?scenario=degraded`       | Degraded provider health                     |
| `/?scenario=offline`        | Repeated WebSocket failure and offline state |
| `/?scenario=quote-rejected` | Server-side `stale_price` rejection          |
| `/?scenario=fast-expiry`    | Four-second quote TTL                        |

The `/status` page exposes the same scenarios as buttons. The mock worker is only started when
`VITE_USE_MOCK_API=true`; it is dynamically imported so real-API builds do not pay for it at startup.

## Architecture

```text
src/
├── app/                 # providers, router, layout, pages, configuration
├── features/
│   ├── rates/           # snapshot query, live store, socket hook, table
│   ├── chart/           # candle query, chart, interval selector
│   ├── quotes/          # quote mutation, form, card, server countdown
│   └── status/          # provider health and diagnostics
├── lib/
│   ├── api/             # typed fetch client, errors, query keys
│   ├── ws/              # protocol guard, backoff, socket state machine
│   ├── format/          # decimal, price, countdown, time helpers
│   └── clock/           # server clock offset
├── components/ui/       # small shared primitives
└── test/                # test setup and MSW fixtures
```

### Data ownership

- TanStack Query owns snapshots, candles, provider status, and quote mutations.
- Zustand owns live ticks and the WebSocket connection state.
- The quote and its expiry live in local component state.
- There is no single global store for everything.

### Live tick path

1. `RatesSocketProvider` opens one WebSocket for the configured symbols.
2. Ticks are buffered and flushed once per animation frame into the Zustand store.
3. Each row selects only its own symbol, so a BTC/USDT tick does not re-render the EUR/USD row.
4. The chart subscribes imperatively to the selected symbol and updates the latest candle without a
   React render per tick.

### Quote expiry

- The server offset is estimated from `issued_at` and the request midpoint.
- The countdown uses `expires_at` against that offset, anchored to the monotonic clock, with a
  one-second safety margin.
- Expired quotes stay visible, disable further action, and offer a new request.
- The backend remains the source of truth and can still reject a quote with `stale_price`.

### Precision

Prices remain strings throughout the UI. `Intl.NumberFormat` handles grouping and configured pair
precision; decimal arithmetic (midpoints) uses scaled `BigInt` values. `lightweight-charts` requires
numbers, so strings are converted only at the chart rendering boundary.

## Testing

```bash
bun run test:run
bun run test:coverage
bun run e2e:install   # first Playwright run only
bun run e2e
```

Coverage currently focuses on:

- socket reconnection, resubscription, heartbeat fallback, and state transitions;
- quote countdown and expiry;
- stale/degraded/offline rendering;
- price formatting and decimal arithmetic;
- API error-envelope parsing;
- Playwright dashboard, deep-link, stale, rejected-quote, fast-expiry, offline, and provider scenarios.

`bun run e2e` starts the Vite dev server through Playwright and uses the MSW fixtures.

## Deployment

- Vercel static build. Framework preset: Vite; build command: `bun run build`; output: `dist`.
- [`vercel.json`](vercel.json) rewrites SPA routes to `index.html`.
- Set `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_USE_MOCK_API`, and the symbol/interval variables per
  environment.
- For a public portfolio demo, deploy with `VITE_USE_MOCK_API=true`; for real environments set it to
  `false` and point the URLs at the API.
- GitHub Actions runs lint, format check, typecheck, unit tests, build, and Playwright on pushes and
  pull requests.

## Known backend gaps

The frontend contract is based on the FXStream design document. These items should be confirmed when
`fxstream-api` implements the endpoints:

1. **No FX endpoints yet.** `/v1/rates`, `/v1/rates/{base}/{quote}/candles`, `/v1/quotes`,
   `/v1/providers/status`, and `/v1/ws/rates` are still template-level. `bun run generate:api` is
   ready but cannot generate useful types until the OpenAPI schema includes them.
2. **Change indicators.** The documented `Rate` model has no `change_pct` or previous close. The UI
   supports an optional `change_pct` and hides the value when absent; add the field to the backend
   for a real indicator.
3. **Precision.** Pair precision is configured in the frontend. Returning `decimals` or `tick_size`
   per rate would remove that duplication.
4. **WebSocket heartbeat.** The client has a no-message watchdog. The server should send a periodic
   heartbeat or support explicit ping/pong so quiet pairs do not trigger false reconnects.
5. **Quote schema.** The UI assumes `POST /v1/quotes` accepts `{ symbol, side, amount? }` and returns
   the documented quote fields (`quote_id`, `bid`, `ask`, `mid`, `spread_bps`, `issued_at`,
   `expires_at`). Confirm field names and error codes.
6. **Provider status shape.** The client accepts either a bare array or `{ providers: [...] }`.
7. **Interval support.** The UI exposes 1m/5m/1h; limit this list if the backend does not aggregate
   all three.
8. **CORS and origin.** Allow the deployed frontend origin, expose any required headers, and accept
   the WebSocket origin.

The design doc lives at [`docs/frontend-design.md`](docs/frontend-design.md), and the implementation
plan is at [`docs/implementation-plan.md`](docs/implementation-plan.md).

## Non-goals

Accounts, portfolios, order execution, native apps, chart drawing tools, multiple simultaneous
quotes, and i18n are out of scope for this scaffold. The current theme is dark-only.
