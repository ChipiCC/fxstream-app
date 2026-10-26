import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProviderStatusList } from '@/features/status/components/ProviderStatusList';
import type { ProviderStatus } from '@/features/status/types';
import { renderWithProviders } from '@/test/render';

const providers: ProviderStatus[] = [
  {
    name: 'Binance',
    state: 'up',
    last_message_at: '2026-10-26T12:00:00.000Z',
    reconnects: 0,
  },
  {
    name: 'Frankfurter',
    state: 'degraded',
    last_message_at: '2026-10-26T11:30:00.000Z',
    reconnects: 3,
  },
];

function renderProviders(
  overrides: {
    providers?: ProviderStatus[];
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    onRetry?: () => void;
  } = {},
) {
  return renderWithProviders(
    <ProviderStatusList
      providers={overrides.providers ?? providers}
      isLoading={overrides.isLoading ?? false}
      isError={overrides.isError ?? false}
      error={overrides.error}
      onRetry={overrides.onRetry ?? (() => {})}
    />,
  );
}

describe('ProviderStatusList', () => {
  it('renders provider state and reconnect history', () => {
    renderProviders();
    expect(screen.getByTestId('provider-binance')).toHaveTextContent('Up');
    expect(screen.getByTestId('provider-frankfurter')).toHaveTextContent('Degraded');
    expect(screen.getByTestId('provider-frankfurter')).toHaveTextContent('3 reconnects');
  });

  it('shows an empty state', () => {
    renderProviders({ providers: [] });
    expect(screen.getByText('No providers configured')).toBeInTheDocument();
  });

  it('shows an error with a retry action', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderProviders({ isError: true, error: new Error('Provider API down'), onRetry });

    expect(screen.getByText('Could not load provider status')).toBeInTheDocument();
    expect(screen.getByText('Provider API down')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
