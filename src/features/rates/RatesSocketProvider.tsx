import type { PropsWithChildren } from 'react';

import { appConfig } from '@/app/config';

import { useRatesSocket } from './hooks/useRatesSocket';

export function RatesSocketProvider({ children }: PropsWithChildren) {
  useRatesSocket(appConfig.defaultSymbols);
  return <>{children}</>;
}
