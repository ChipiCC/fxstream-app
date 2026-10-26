import { useQuery } from '@tanstack/react-query';

import { appConfig } from '@/app/config';
import { getRates } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

export function useRatesSnapshot(symbols: string[] = appConfig.defaultSymbols) {
  return useQuery({
    queryKey: queryKeys.rates(symbols),
    queryFn: ({ signal }) => getRates(symbols, signal),
    staleTime: 10_000,
    refetchInterval: appConfig.ratesRefetchIntervalMs,
    refetchOnWindowFocus: true,
  });
}
