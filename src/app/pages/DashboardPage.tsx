import { appConfig } from '@/app/config';

import { DashboardView } from './DashboardView';

export function DashboardPage() {
  return <DashboardView selectedSymbol={appConfig.defaultSymbols[0] ?? 'EUR/USD'} />;
}
