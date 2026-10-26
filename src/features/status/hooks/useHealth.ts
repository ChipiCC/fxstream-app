import { useQuery } from '@tanstack/react-query';

import { appConfig } from '@/app/config';
import { getHealth } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getHealth(signal),
    staleTime: 8_000,
    refetchInterval: appConfig.healthRefetchIntervalMs,
    refetchOnWindowFocus: true,
    retry: 0,
  });
}
