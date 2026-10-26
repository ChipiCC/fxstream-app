import { Badge } from '@/components/ui/Badge';
import { useLiveRatesStore } from '@/features/rates/store';
import type { ConnectionState } from '@/features/rates/types';

const stateConfig: Record<
  ConnectionState,
  { label: string; variant: 'positive' | 'warning' | 'negative' | 'neutral'; detail: string }
> = {
  connecting: { label: 'Connecting', variant: 'neutral', detail: 'Opening the live feed' },
  live: { label: 'Live', variant: 'positive', detail: 'Receiving live ticks' },
  reconnecting: { label: 'Reconnecting', variant: 'warning', detail: 'Retrying the live feed' },
  offline: { label: 'Offline', variant: 'negative', detail: 'Live updates are paused' },
};

export function ConnectionBadge() {
  const connectionState = useLiveRatesStore((state) => state.connectionState);
  const config = stateConfig[connectionState];

  return (
    <span data-testid="connection-badge" title={config.detail} aria-live="polite">
      <Badge variant={config.variant} dot>
        {config.label}
      </Badge>
    </span>
  );
}
