import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatePanel } from '@/components/ui/StatePanel';
import { errorMessage } from '@/lib/api/errors';
import { formatLocalDateTime, formatUtcTitle } from '@/lib/format/time';
import { cn } from '@/lib/cn';

import type { ProviderState, ProviderStatus } from '../types';

interface ProviderStatusListProps {
  providers: ProviderStatus[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}

const stateConfig: Record<
  ProviderState,
  { label: string; variant: 'positive' | 'warning' | 'negative' }
> = {
  up: { label: 'Up', variant: 'positive' },
  degraded: { label: 'Degraded', variant: 'warning' },
  down: { label: 'Down', variant: 'negative' },
};

export function ProviderStatusList({
  providers,
  isLoading,
  isError,
  error,
  onRetry,
}: ProviderStatusListProps) {
  return (
    <section
      aria-labelledby="providers-heading"
      className="border-line bg-surface/90 rounded-xl border"
    >
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3.5">
        <div>
          <h2 id="providers-heading" className="text-ink text-sm font-semibold">
            Providers
          </h2>
          <p className="text-faint mt-0.5 text-[11px]">
            Upstream feeds and their reconnect history
          </p>
        </div>
        <Badge variant="outline">{providers?.length ?? 0} feeds</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="p-4">
          <StatePanel
            compact
            tone="error"
            title="Could not load provider status"
            description={errorMessage(error)}
            action={
              <Button size="sm" onClick={onRetry}>
                Retry
              </Button>
            }
          />
        </div>
      ) : null}

      {!isLoading && !isError && (providers?.length ?? 0) === 0 ? (
        <div className="p-4">
          <StatePanel compact title="No providers configured" />
        </div>
      ) : null}

      {!isLoading && !isError && providers && providers.length > 0 ? (
        <ul className="divide-line-subtle divide-y">
          {providers.map((provider) => {
            const config = stateConfig[provider.state];
            return (
              <li
                key={provider.name}
                data-testid={`provider-${provider.name.toLowerCase()}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      provider.state === 'up' && 'bg-positive',
                      provider.state === 'degraded' && 'bg-warning',
                      provider.state === 'down' && 'bg-negative',
                    )}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-ink text-sm font-medium">{provider.name}</p>
                    <p
                      className="text-faint mt-0.5 text-[10px]"
                      title={formatUtcTitle(provider.last_message_at)}
                    >
                      Last message {formatLocalDateTime(provider.last_message_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-faint font-mono text-[10px]">
                    {provider.reconnects} reconnects
                  </span>
                  <Badge variant={config.variant} dot>
                    {config.label}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
