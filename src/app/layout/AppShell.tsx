import { Link, Outlet, useLocation } from 'react-router';

import { appConfig } from '@/app/config';
import { Badge } from '@/components/ui/Badge';
import { ConnectionBadge } from '@/features/rates/components/ConnectionBadge';
import { OfflineBanner } from '@/features/rates/components/OfflineBanner';
import { ProviderHealthBadge } from '@/features/status/components/ProviderHealthBadge';
import { cn } from '@/lib/cn';

const navLinkClassName = (active: boolean) =>
  cn(
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
    active ? 'bg-surface-hover text-ink' : 'text-muted hover:bg-surface-hover hover:text-ink',
  );

export function AppShell() {
  const { pathname } = useLocation();
  const marketActive = !pathname.startsWith('/status');

  return (
    <div className="flex min-h-screen flex-col" data-testid="app-shell">
      <a
        href="#main-content"
        className="bg-accent text-canvas sr-only z-50 rounded-md px-3 py-2 text-xs font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <header className="border-line/80 bg-canvas/85 sticky top-0 z-30 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="border-accent/30 bg-accent/10 text-accent group-hover:bg-accent/15 grid size-8 place-items-center rounded-lg border font-mono text-[11px] font-bold transition-colors">
              FX
            </span>
            <span>
              <span className="text-ink block text-sm font-semibold tracking-tight">FXStream</span>
              <span className="text-faint block text-[9px] tracking-[0.14em] uppercase">
                Live market terminal
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="order-3 flex w-full gap-1 sm:order-none sm:ml-4 sm:w-auto"
          >
            <Link
              to="/"
              className={navLinkClassName(marketActive)}
              aria-current={marketActive ? 'page' : undefined}
            >
              Markets
            </Link>
            <Link
              to="/status"
              className={navLinkClassName(pathname === '/status')}
              aria-current={pathname === '/status' ? 'page' : undefined}
            >
              Status
            </Link>
          </nav>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {appConfig.useMockApi ? (
              <Badge variant="info" className="hidden sm:inline-flex">
                Mock data
              </Badge>
            ) : null}
            <ProviderHealthBadge />
            <ConnectionBadge />
          </div>
        </div>
      </header>

      <OfflineBanner />

      <main
        id="main-content"
        className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        <Outlet />
      </main>

      <footer className="border-line/70 border-t">
        <div className="text-faint mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[10px] sm:px-6">
          <span>FXStream Web · REST snapshots + WebSocket ticks</span>
          <span>Prices are informational only. No execution.</span>
        </div>
      </footer>
    </div>
  );
}
