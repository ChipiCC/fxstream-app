import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';

import { appConfig } from '@/app/config';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLiveRatesStore } from '@/features/rates/store';
import { ProviderStatusList } from '@/features/status/components/ProviderStatusList';
import { useHealth } from '@/features/status/hooks/useHealth';
import { useProviderStatus } from '@/features/status/hooks/useProviderStatus';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/queryKeys';
import { getLastClockSyncAt, getServerOffsetMs } from '@/lib/clock/serverClock';
import { cn } from '@/lib/cn';
import { formatLocalDateTime, formatUtcTitle } from '@/lib/format/time';
import {
  getMockScenario,
  MOCK_SCENARIO_DESCRIPTIONS,
  MOCK_SCENARIO_LABELS,
  MOCK_SCENARIOS,
} from '@/test/mocks/scenario';

function formatOffset(offsetMs: number): string {
  const rounded = Math.round(offsetMs);
  return `${rounded >= 0 ? '+' : ''}${rounded} ms`;
}

function formatTimestamp(value: number | null): string {
  return value ? formatLocalDateTime(new Date(value).toISOString()) : '—';
}

export function StatusPage() {
  const queryClient = useQueryClient();
  const providerQuery = useProviderStatus();
  const healthQuery = useHealth();
  const connectionState = useLiveRatesStore((state) => state.connectionState);
  const lastMessageAt = useLiveRatesStore((state) => state.lastMessageAt);
  const ticks = useLiveRatesStore((state) => state.ticks);
  const mockScenario = getMockScenario();
  const clockOffset = getServerOffsetMs();
  const clockSyncedAt = getLastClockSyncAt();
  const tickCount = Object.keys(ticks).length;

  const healthLabel = healthQuery.isLoading
    ? 'Checking…'
    : healthQuery.isError
      ? 'Unreachable'
      : (healthQuery.data?.status ?? 'Reachable');
  const healthTone = healthQuery.isLoading
    ? 'neutral'
    : healthQuery.isError
      ? 'negative'
      : 'positive';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.ratesRoot });
    void queryClient.invalidateQueries({ queryKey: queryKeys.candlesRoot });
    void queryClient.invalidateQueries({ queryKey: queryKeys.providers });
    void queryClient.invalidateQueries({ queryKey: queryKeys.health });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-[10px] font-medium tracking-[0.18em] uppercase">
            Operations
          </p>
          <h1 className="text-ink mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Status & diagnostics
          </h1>
          <p className="text-muted mt-1.5 max-w-2xl text-xs leading-5">
            Provider health, connection state, clock synchronization, and demo scenarios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={refresh}>
            Refresh
          </Button>
          <Link
            to="/"
            className="border-line bg-surface-raised text-ink hover:bg-surface-hover inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-faint text-[10px] tracking-[0.12em] uppercase">WebSocket</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                connectionState === 'live' && 'bg-positive',
                connectionState === 'connecting' && 'bg-info',
                connectionState === 'reconnecting' && 'bg-warning',
                connectionState === 'offline' && 'bg-negative',
              )}
            />
            <p className="text-ink font-mono text-lg font-medium capitalize">{connectionState}</p>
          </div>
          <p className="text-faint mt-2 text-[10px]">
            Last message {formatTimestamp(lastMessageAt)}
          </p>
          <p className="text-faint mt-1 text-[10px]">
            {tickCount} of {appConfig.defaultSymbols.length} symbols have live data
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-faint text-[10px] tracking-[0.12em] uppercase">REST health</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                healthTone === 'positive' && 'bg-positive',
                healthTone === 'negative' && 'bg-negative',
                healthTone === 'neutral' && 'bg-faint',
              )}
            />
            <p className="text-ink font-mono text-lg font-medium">{healthLabel}</p>
          </div>
          <p className="text-faint mt-2 truncate text-[10px]" title={appConfig.apiHealthUrl}>
            {appConfig.apiHealthUrl}
          </p>
          {healthQuery.isError ? (
            <p className="text-negative mt-1 line-clamp-2 text-[10px]">
              {errorMessage(healthQuery.error)}
            </p>
          ) : null}
        </Card>

        <Card className="p-4">
          <p className="text-faint text-[10px] tracking-[0.12em] uppercase">Server clock offset</p>
          <p className="text-ink mt-2 font-mono text-lg font-medium">{formatOffset(clockOffset)}</p>
          <p className="text-faint mt-2 text-[10px]">
            Last quote sync {clockSyncedAt ? formatTimestamp(clockSyncedAt) : 'not synced yet'}
          </p>
          <p className="text-faint mt-1 text-[10px]">Quote countdowns use this offset</p>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ProviderStatusList
          providers={providerQuery.data}
          isLoading={providerQuery.isLoading}
          isError={providerQuery.isError}
          error={providerQuery.error}
          onRetry={() => void providerQuery.refetch()}
        />

        <Card className="overflow-hidden">
          <div className="border-line border-b px-4 py-3.5">
            <h2 className="text-ink text-sm font-semibold">Connection details</h2>
            <p className="text-faint mt-0.5 text-[11px]">
              Static configuration and the latest live-feed state
            </p>
          </div>
          <dl className="divide-line-subtle divide-y text-xs">
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="text-faint">API base</dt>
              <dd
                className="text-muted max-w-[65%] truncate font-mono text-[10px]"
                title={appConfig.apiBaseUrl}
              >
                {appConfig.apiBaseUrl}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="text-faint">WebSocket URL</dt>
              <dd
                className="text-muted max-w-[65%] truncate font-mono text-[10px]"
                title={appConfig.wsUrl}
              >
                {appConfig.wsUrl}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="text-faint">Mock mode</dt>
              <dd>
                <Badge variant={appConfig.useMockApi ? 'info' : 'outline'}>
                  {appConfig.useMockApi ? 'MSW fixtures' : 'Live API'}
                </Badge>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="text-faint">Default symbols</dt>
              <dd className="text-muted text-right font-mono text-[10px]">
                {appConfig.defaultSymbols.join(', ')}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <dt className="text-faint">Last message</dt>
              <dd
                className="text-muted text-right text-[10px]"
                title={
                  lastMessageAt ? formatUtcTitle(new Date(lastMessageAt).toISOString()) : undefined
                }
              >
                {formatTimestamp(lastMessageAt)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {appConfig.useMockApi ? (
        <section
          aria-labelledby="scenarios-heading"
          className="border-line bg-surface/90 rounded-xl border"
        >
          <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
            <div>
              <h2 id="scenarios-heading" className="text-ink text-sm font-semibold">
                Demo scenarios
              </h2>
              <p className="text-faint mt-0.5 text-[11px]">
                Reloads the app with different mock conditions. Visible only in mock mode.
              </p>
            </div>
            <Badge variant="info" dot>
              Current: {MOCK_SCENARIO_LABELS[mockScenario]}
            </Badge>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_SCENARIOS.map((scenario) => (
              <a
                key={scenario}
                href={`/status?scenario=${scenario}`}
                data-testid={`scenario-${scenario}`}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  scenario === mockScenario
                    ? 'border-accent/40 bg-accent/[0.06]'
                    : 'border-line bg-canvas/40 hover:border-line hover:bg-surface-hover',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink text-xs font-medium">
                    {MOCK_SCENARIO_LABELS[scenario]}
                  </span>
                  {scenario === mockScenario ? <Badge variant="accent">Active</Badge> : null}
                </div>
                <p className="text-muted mt-1.5 text-[10px] leading-4">
                  {MOCK_SCENARIO_DESCRIPTIONS[scenario]}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
