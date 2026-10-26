import { Link } from 'react-router';

import { Badge } from '@/components/ui/Badge';

import { useProviderStatus } from '../hooks/useProviderStatus';

export function ProviderHealthBadge() {
  const query = useProviderStatus();
  const providers = query.data ?? [];

  const down = providers.some((provider) => provider.state === 'down');
  const degraded = providers.some((provider) => provider.state === 'degraded');
  const up = providers.filter((provider) => provider.state === 'up').length;

  let label = 'Providers…';
  let variant: 'positive' | 'warning' | 'negative' | 'neutral' = 'neutral';
  let title = 'Provider status is loading';

  if (query.isError) {
    label = 'Providers unknown';
    title = 'Provider status is unavailable';
  } else if (!query.isLoading && providers.length === 0) {
    label = 'No providers';
    title = 'No providers are configured';
  } else if (providers.length > 0) {
    if (down) {
      label = 'Provider down';
      variant = 'negative';
      title = 'At least one provider is down';
    } else if (degraded) {
      label = 'Provider degraded';
      variant = 'warning';
      title = 'At least one provider is degraded';
    } else {
      label = `${up}/${providers.length} providers up`;
      variant = 'positive';
      title = 'All providers are healthy';
    }
  }

  return (
    <Link
      to="/status"
      data-testid="provider-health"
      title={title}
      className="inline-flex items-center rounded-full transition-opacity hover:opacity-80"
    >
      <Badge variant={variant} dot>
        {label}
      </Badge>
    </Link>
  );
}
