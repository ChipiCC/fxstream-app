import { useQuery } from '@tanstack/react-query';

import { appConfig } from '@/app/config';
import { getProviderStatus } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';

export function useProviderStatus() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: ({ signal }) => getProviderStatus(signal),
    staleTime: 8_000,
    refetchInterval: appConfig.providerStatusRefetchIntervalMs,
    refetchOnWindowFocus: true,
  });
}
