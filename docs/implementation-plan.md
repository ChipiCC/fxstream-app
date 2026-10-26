# FXStream Web — Scaffold Implementation Plan

Status: implemented in this repository. The checklist below is the plan that was executed, with the
final implementation notes included.

## 1. Context and assumptions

- New standalone repo at `fxstream-web`, sibling to `fxstream-api`.
- The backend is still a FastAPI template; none of the FXStream `/v1` endpoints existed at scaffold
  time.
- The frontend contract is the documented design in [`frontend-design.md`](frontend-design.md).
- Stack: Bun, Vite, React, TypeScript strict, Tailwind CSS v4, React Router, TanStack Query, Zustand,
  `lightweight-charts`, MSW, Vitest/RTL, Playwright.
- Mock mode is the development default. Switching to a real API requires environment variables only.
- Provisional UX defaults: dark theme only, English only, one active quote, no chart drawing tools,
  no authentication.

## 2. Target repository layout

```text
fxstream-web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── config.ts
│   │   ├── layout/AppShell.tsx
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── DashboardView.tsx
│   │       ├── PairPage.tsx
│   │       ├── StatusPage.tsx
│   │       ├── NotFoundPage.tsx
│   │       └── RouteErrorPage.tsx
│   ├── features/
│   │   ├── rates/
│   │   │   ├── types.ts
│   │   │   ├── store.ts
│   │   │   ├── RatesSocketProvider.tsx
│   │   │   ├── hooks/
│   │   │   └── components/
│   │   ├── chart/
│   │   ├── quotes/
│   │   └── status/
│   ├── lib/
│   │   ├── api/          # client, errors, query keys
│   │   ├── ws/           # protocol, backoff, socket state machine
│   │   ├── format/       # price, decimal, countdown, time
│   │   └── clock/        # server clock offset, reactive clock
│   ├── components/ui/    # Button, Badge, Card, Field, Skeleton, StatePanel
│   ├── test/
│   │   ├── setup.ts
│   │   ├── render.tsx
│   │   └── mocks/        # fixtures, REST + WS handlers, scenarios
│   ├── styles/index.css
│   └── main.tsx
├── e2e/
├── public/mockServiceWorker.js
├── docs/
├── .github/workflows/ci.yml
├── .env.example
├── eslint.config.js
├── playwright.config.ts
├── vite.config.ts
├── vitest.config.ts
├── vercel.json
├── README.md
└── AGENTS.md
```

## 3. Milestones

### M0 — Repository bootstrap and quality gates

- Create the repo and initialize Git.
- Scaffold Vite + React + TypeScript.
- Install React Router, TanStack Query, Zustand, `lightweight-charts`, Tailwind v4, and `clsx`.
- Install ESLint, Prettier with Tailwind class sorting, Vitest, RTL, MSW, Playwright, and
  `openapi-typescript`.
- Configure strict TypeScript, `@/` path alias, Tailwind, dark tokens, and scripts.
- Add `.env.example`, `.mise.toml`, `.nvmrc`, `.editorconfig`, `.gitignore`, and CI skeleton.

Done when: dev server starts, build succeeds, and lint/format/typecheck/tests pass.

### M1 — App shell, routes, and UI foundation

- Add QueryClientProvider, router, route error page, and mock bootstrap.
- Implement `/`, `/pair/:base/:quote`, `/status`, and `*`.
- Build AppShell with navigation, connection badge, provider health, and offline banner.
- Build shared primitives and loading/empty/error panels.
- Implement the responsive dashboard/table/chart/quote layout.
- Add dark design tokens and accessible focus/table/form semantics.

Done when: every route renders directly and the shell is responsive.

### M2 — Contracts, configuration, API client, and mock backend

- Define interim `Rate`, `Candle`, `Quote`, `ProviderStatus`, and WebSocket message types.
- Add one fetch wrapper with base URL ownership and backend error-envelope parsing.
- Add query-key factories and formatting helpers.
- Validate `VITE_*` configuration at startup; keep symbols, intervals, and precision in config.
- Build deterministic MSW fixtures and handlers for all REST endpoints.
- Build a mock WebSocket that honors subscribe/unsubscribe, sends ticks, and emits heartbeats.
- Add scenarios: normal, stale, degraded, offline, quote-rejected, fast-expiry.
- Add the OpenAPI type-generation script for later.

Done when: the app runs fully offline against mocks.

### M3 — Live rates vertical slice

- Fetch the initial snapshot with TanStack Query.
- Build the socket client with state machine, backoff + jitter, resubscription, subscription diffing,
  heartbeat watchdog, and browser online/offline handling.
- Own one connection app-wide through `RatesSocketProvider`.
- Batch Zustand writes per animation frame.
- Subscribe each row only to its own symbol.
- Build RatesTable, RateRow, change indicator, stale badge, connection badge, and offline banner.
- Merge snapshot stale flags with live ticks and refetch the snapshot after reconnect.
- Add the provider status query and compact header indicator.

Done when: mock ticks update rows, reconnect/resubscribe tests pass, and offline keeps last values.

### M4 — Chart and pair routing

- Add candle queries and mocks for 1m, 5m, 1h.
- Wrap `lightweight-charts` with proper resize/dispose and dark styling.
- Add interval selector and chart loading/empty/error states.
- Update the active candle imperatively from live ticks.
- Reuse a shared DashboardView for `/` and `/pair/:base/:quote`.
- Validate deep links and unknown pairs without crashing.

Done when: deep links select a pair, intervals refetch, live ticks move the latest candle, and chart
cleanup is verified.

### M5 — Quotes and countdown

- Build quote form with pair, side, amount, and stale/offline gating.
- Call `POST /v1/quotes` through a TanStack mutation and render QuoteCard.
- Estimate server clock offset from `issued_at` and request timing.
- Count down against the server offset with a safety margin.
- Mark expired, disable action, and offer a new quote.
- Show server rejection reasons in plain language.
- Keep one active quote and mock a four-second TTL scenario.

Done when: countdown/expiry tests pass and quote errors are actionable.

### M6 — Status page and resilience polish

- Provider status list with state, last message, reconnect count, and refetch.
- Connection diagnostics: REST health, WS state, last tick, clock offset, and mock controls.
- Degraded/offline banners, stale labeling, skeletons, retry actions, and 404.
- Keyboard/focus audit, color-independent status meaning, and reduced motion.
- `aria-live` for connection changes and quote expiry, not for every tick.

Done when: every UX state is demoable via a mock scenario.

### M7 — Tests, CI, deployment, and documentation

- Unit tests for backoff/jitter, protocol validation, decimal/price formatting, and store batching.
- Component tests for table rows, connection states, and quote countdown.
- Socket client tests for reconnect, resubscribe, subscription diffing, heartbeat, and offline.
- API tests for snapshot/candles/quote/provider/health and error envelopes.
- Playwright tests for dashboard, deep links, stale, rejected quote, fast expiry, offline, and
  degraded provider.
- CI: frozen Bun install, lint, format check, typecheck, tests, build, and Playwright.
- Vercel SPA rewrite and environment documentation.
- README and AGENTS documentation.

Done when: `bun run check` and `bun run e2e` pass from a clean checkout.

## 4. Key implementation decisions

### Data ownership

- TanStack Query: snapshots, candles, provider status, quote mutations.
- Zustand: live ticks and connection state.
- Local component state: active quote, form fields, countdown expiry.
- No global store for everything.

### Live socket

- One connection owned by `RatesSocketProvider`.
- States: `connecting`, `live`, `reconnecting`, `offline`.
- Exponential backoff with jitter, capped at 15 seconds.
- Reconnect attempts continue while offline; the badge settles on `offline` after four quick
  failures.
- A connection must stay open for five seconds before the retry counter resets; this prevents a
  server that accepts and immediately drops from looking healthy.
- All active subscriptions are resent on reconnect.
- The heartbeat watchdog forces a reconnect after 25 seconds without any message.
- Browser `offline` closes the socket and stops retrying until `online`.

### Live tick batching

- Ticks are queued outside React and flushed with `requestAnimationFrame`.
- Each row uses a symbol-scoped Zustand selector.
- Chart live updates use an imperative store subscription.

### Quote clock

- Server offset is estimated from `issued_at` and the request midpoint.
- Countdown uses the server offset, anchored to the monotonic clock, with a one-second safety margin.
- Expiry is visible and terminal; a new request creates a new quote.
- The backend remains authoritative and can reject with `stale_price`.

### Precision

- Prices remain strings.
- Integer grouping uses `Intl.NumberFormat`; fractions are padded/truncated to pair precision.
- Midpoints use scaled `BigInt` arithmetic.
- Chart numbers are a rendering-boundary exception.

### Mock layer

- MSW serves both REST and WebSocket traffic in browser mode.
- Scenarios are URL-driven and also exposed on `/status` in mock mode.
- `offline` closes WebSocket connections immediately so retries accumulate.
- `fast-expiry` uses a four-second TTL.
- `quote-rejected` returns the backend error envelope with `stale_price`.

## 5. Backend contract gaps

1. FX endpoints are not implemented yet; OpenAPI generation is blocked until they are.
2. `Rate` lacks `change_pct`/previous close. The UI supports optional `change_pct` and hides the
   indicator when absent.
3. Pair precision is frontend config; the backend could return decimals/tick size.
4. WebSocket heartbeats are not specified. The client has a watchdog; the server should send a
   heartbeat or support explicit ping/pong.
5. Quote request/response fields are assumed from the design. Confirm error codes and envelopes.
6. Provider status accepts either a bare array or `{ providers: [] }`.
7. The UI exposes 1m/5m/1h; limit this if the backend cannot aggregate all three.
8. CORS, WebSocket origins, and the `/v1` versus `/api/v1` prefix need to be aligned on deployment.
9. No secrets in Vite variables. If API-key auth is enabled, add a proxy/BFF.

## 6. Definition of done

- Fresh clone: `bun install`, copy `.env.example`, `bun run dev` shows the mocked dashboard.
- All four routes support direct loading.
- Live rows update, chart follows the selected pair, and the latest candle updates from ticks.
- Quote countdown uses server time, expires visibly, and prevents further action.
- Stale, degraded, error, empty, and offline states are explicit and testable.
- Switching `VITE_USE_MOCK_API=false` plus real URLs requires no component changes.
- `bun run check` and `bun run e2e` pass.
- Vercel preview deployment works with SPA rewrites.
- README and AGENTS docs cover setup, architecture, mocks, and backend gaps.

## 7. Deferred

- Accounts, login, portfolios, order execution, and fund movement.
- Native applications.
- Chart drawing tools.
- Theme switcher.
- Internationalization.
- Multiple simultaneous quotes.
- Table virtualization.
- Final generated API types until the backend exposes the FX OpenAPI schema.
