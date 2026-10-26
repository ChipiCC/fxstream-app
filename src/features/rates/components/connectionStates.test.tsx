import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectionBadge } from '@/features/rates/components/ConnectionBadge';
import { OfflineBanner } from '@/features/rates/components/OfflineBanner';
import { useLiveRatesStore } from '@/features/rates/store';

describe('connection states', () => {
  beforeEach(() => {
    useLiveRatesStore.getState().reset();
  });

  it('shows the current connection badge', () => {
    useLiveRatesStore.getState().setConnectionState('reconnecting');
    render(<ConnectionBadge />);
    expect(screen.getByTestId('connection-badge')).toHaveTextContent('Reconnecting');
  });

  it('shows an offline banner with the last tick time', () => {
    useLiveRatesStore.getState().setConnectionState('offline');
    useLiveRatesStore.setState({ lastMessageAt: Date.parse('2026-10-26T12:00:00.000Z') });
    render(<OfflineBanner />);

    expect(screen.getByTestId('offline-banner')).toHaveTextContent('Live updates are paused');
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('Last tick at');
  });

  it('hides the banner for non-offline states', () => {
    useLiveRatesStore.getState().setConnectionState('live');
    render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });
});
