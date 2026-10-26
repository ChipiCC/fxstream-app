import type { Rate } from '@/features/rates/types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatePanel } from '@/components/ui/StatePanel';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { appConfig } from '@/app/config';

import { RateRow } from './RateRow';

interface RatesTableProps {
  rates: Rate[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selectedSymbol: string;
}

function RatesSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid grid-cols-[1.3fr_1fr_0.8fr_0.6fr] gap-3 py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20 justify-self-end" />
          <Skeleton className="h-4 w-14 justify-self-end" />
          <Skeleton className="h-4 w-12 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function RatesTable({
  rates,
  isLoading,
  isError,
  error,
  onRetry,
  selectedSymbol,
}: RatesTableProps) {
  const orderedRates = rates
    ? [...rates].sort(
        (left, right) =>
          appConfig.defaultSymbols.indexOf(left.symbol) -
          appConfig.defaultSymbols.indexOf(right.symbol),
      )
    : [];

  return (
    <section
      aria-labelledby="rates-heading"
      className="border-line bg-surface/90 overflow-hidden rounded-xl border"
    >
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
        <div>
          <h2 id="rates-heading" className="text-ink text-sm font-semibold">
            Live rates
          </h2>
          <p className="text-faint mt-0.5 text-[11px]">
            Snapshot plus stream updates for {appConfig.defaultSymbols.length} pairs
          </p>
        </div>
        <Badge variant="outline" dot>
          WebSocket
        </Badge>
      </div>

      {isLoading ? <RatesSkeleton /> : null}

      {!isLoading && isError ? (
        <div className="p-4">
          <StatePanel
            compact
            tone="error"
            title="Could not load rates"
            description={errorMessage(error)}
            action={
              <Button size="sm" onClick={onRetry}>
                Retry
              </Button>
            }
          />
        </div>
      ) : null}

      {!isLoading && !isError && orderedRates.length === 0 ? (
        <div className="p-4">
          <StatePanel
            compact
            title="No rates available"
            description="The API returned no rates for the configured symbols."
          />
        </div>
      ) : null}

      {!isLoading && !isError && orderedRates.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Live FX and crypto rates</caption>
            <thead>
              <tr className="border-line-subtle text-faint border-b text-left text-[10px] tracking-[0.12em] uppercase">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Pair
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Change
                </th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium md:table-cell">
                  Source
                </th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedRates.map((rate) => (
                <RateRow key={rate.symbol} rate={rate} selected={rate.symbol === selectedSymbol} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
