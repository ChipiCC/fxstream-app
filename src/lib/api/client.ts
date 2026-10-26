import { appConfig, splitSymbol } from '@/app/config';
import type { Candle, ChartInterval } from '@/features/chart/types';
import type { Quote, QuoteRequest, QuoteResponse } from '@/features/quotes/types';
import type { Rate, RatesResponse } from '@/features/rates/types';
import type { HealthStatus, ProviderStatus, ProviderStatusResponse } from '@/features/status/types';

import { apiErrorFromResponse, ApiError } from './errors';

const REQUEST_TIMEOUT_MS = 15_000;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = REQUEST_TIMEOUT_MS, headers, signal, ...init } = options;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      signal: combinedSignal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('Unable to reach the FXStream API.', {
      status: 0,
      code: 'network_error',
      cause: error,
    });
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapList<T>(value: T[] | Record<string, T[]>, key: string): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  const list = value[key];
  return Array.isArray(list) ? list : [];
}

export async function getRates(symbols: string[], signal?: AbortSignal): Promise<Rate[]> {
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  const response = await request<RatesResponse>(`/rates?${params.toString()}`, { signal });
  return unwrapList(response, 'rates');
}

export async function getCandles(
  symbol: string,
  interval: ChartInterval,
  limit = 180,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const { base, quote } = splitSymbol(symbol);
  const params = new URLSearchParams({ interval, limit: String(limit) });
  const response = await request<Candle[] | { candles: Candle[] }>(
    `/rates/${encodeURIComponent(base)}/${encodeURIComponent(quote)}/candles?${params.toString()}`,
    { signal },
  );
  return unwrapList(response, 'candles');
}

export async function createQuote(payload: QuoteRequest): Promise<Quote> {
  const response = await request<QuoteResponse>('/quotes', {
    method: 'POST',
    body: payload,
    timeoutMs: 10_000,
  });
  return isRecord(response) && 'quote' in response
    ? (response.quote as Quote)
    : (response as Quote);
}

export async function getProviderStatus(signal?: AbortSignal): Promise<ProviderStatus[]> {
  const response = await request<ProviderStatusResponse>('/providers/status', { signal });
  return unwrapList(response, 'providers');
}

export async function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await fetch(appConfig.apiHealthUrl, {
    headers: { Accept: 'application/json' },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(5_000)])
      : AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return (await response.json()) as HealthStatus;
}
