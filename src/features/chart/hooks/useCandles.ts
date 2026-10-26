import { useQuery } from '@tanstack/react-query';

import { appConfig } from '@/app/config';
import type { ChartInterval } from '@/features/chart/types';
import { getCandles } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

export function useCandles(symbol: string, interval: ChartInterval) {
  return useQuery({
    queryKey: queryKeys.candles(symbol, interval),
    queryFn: ({ signal }) => getCandles(symbol, interval, 180, signal),
    staleTime: 30_000,
    refetchInterval: appConfig.ratesRefetchIntervalMs,
    refetchOnWindowFocus: true,
  });
}
