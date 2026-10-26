export type ProviderState = 'up' | 'degraded' | 'down';

export interface ProviderStatus {
  name: string;
  state: ProviderState;
  last_message_at: string | null;
  reconnects: number;
}

export type ProviderStatusResponse = ProviderStatus[] | { providers: ProviderStatus[] };

export interface HealthStatus {
  status: string;
}
