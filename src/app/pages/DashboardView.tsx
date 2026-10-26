import { lazy, Suspense } from 'react';

import { PairChartFallback } from '@/features/chart/components/PairChartFallback';
import { QuotePanel } from '@/features/quotes/components/QuotePanel';
import { RatesTable } from '@/features/rates/components/RatesTable';
import { useRatesSnapshot } from '@/features/rates/hooks/useRatesSnapshot';

const PairChart = lazy(() =>
  import('@/features/chart/components/PairChart').then((module) => ({
    default: module.PairChart,
  })),
);

interface DashboardViewProps {
  selectedSymbol: string;
}

export function DashboardView({ selectedSymbol }: DashboardViewProps) {
  const ratesQuery = useRatesSnapshot();
  const rates = ratesQuery.data;
  const selectedRate = rates?.find((rate) => rate.symbol === selectedSymbol);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-[10px] font-medium tracking-[0.18em] uppercase">
            Live market
          </p>
          <h1 className="text-ink mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            FXStream dashboard
          </h1>
          <p className="text-muted mt-1.5 max-w-2xl text-xs leading-5">
            Streaming FX and crypto prices, historical candles, and short-lived quotes. Stale data
            and disconnections stay visible.
          </p>
        </div>
        <div className="border-line bg-surface/70 rounded-lg border px-3 py-2 text-right">
          <p className="text-faint text-[10px] tracking-[0.12em] uppercase">Selected pair</p>
          <p className="text-ink mt-0.5 font-mono text-sm font-medium">{selectedSymbol}</p>
        </div>
      </header>

      <RatesTable
        rates={rates}
        isLoading={ratesQuery.isLoading}
        isError={ratesQuery.isError}
        error={ratesQuery.error}
        onRetry={() => void ratesQuery.refetch()}
        selectedSymbol={selectedSymbol}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,1fr)]">
        <Suspense fallback={<PairChartFallback />}>
          <PairChart symbol={selectedSymbol} />
        </Suspense>
        <QuotePanel
          key={selectedSymbol}
          symbol={selectedSymbol}
          rate={selectedRate}
          rateLoading={ratesQuery.isLoading}
          rateError={ratesQuery.error}
        />
      </div>
    </div>
  );
}
