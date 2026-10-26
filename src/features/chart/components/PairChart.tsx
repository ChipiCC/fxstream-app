import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { appConfig, pairDecimals, splitSymbol } from '@/app/config';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatePanel } from '@/components/ui/StatePanel';
import {
  CHART_INTERVALS,
  INTERVAL_SECONDS,
  type ChartInterval,
  type Candle,
} from '@/features/chart/types';
import { useLiveRatesStore } from '@/features/rates/store';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { displayPrice, formatPrice } from '@/lib/format/price';
import { formatLocalDateTime } from '@/lib/format/time';

import { useCandles } from '../hooks/useCandles';

interface PairChartProps {
  symbol: string;
}

const CHART_COLORS = {
  positive: '#34d399',
  negative: '#fb7185',
  text: '#8e9bad',
  grid: 'rgba(32, 43, 58, 0.55)',
  border: '#202b3a',
  crosshair: 'rgba(79, 209, 197, 0.55)',
};

function toChartTime(value: string): UTCTimestamp {
  return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

function toCandleData(candle: Candle): CandlestickData<Time> {
  return {
    time: toChartTime(candle.open_time),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

function candleBucket(asOf: string, interval: ChartInterval): UTCTimestamp {
  const timestamp = Date.parse(asOf);
  const seconds = Number.isNaN(timestamp) ? Math.floor(Date.now() / 1000) : timestamp / 1000;
  const size = INTERVAL_SECONDS[interval];
  return (Math.floor(seconds / size) * size) as UTCTimestamp;
}

function ChartLastPrice({
  symbol,
  fallback,
  decimals,
}: {
  symbol: string;
  fallback: string | undefined;
  decimals: number;
}) {
  const tick = useLiveRatesStore((state) => state.ticks[symbol]);
  const value = tick ? displayPrice(tick, fallback ?? '') : fallback;

  return (
    <span className="text-muted hidden font-mono text-xs tabular-nums sm:inline">
      Last {value ? formatPrice(value, decimals) : '—'}
    </span>
  );
}

export function PairChart({ symbol }: PairChartProps) {
  const [interval, setInterval] = useState<ChartInterval>(appConfig.defaultInterval);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const latestCandleRef = useRef<CandlestickData<Time> | null>(null);
  const dataKeyRef = useRef<string | null>(null);
  const headingId = useId();
  const candlesQuery = useCandles(symbol, interval);
  const connectionState = useLiveRatesStore((state) => state.connectionState);
  const liveTickStale = useLiveRatesStore((state) => state.ticks[symbol]?.stale ?? false);
  const decimals = pairDecimals(symbol);
  const { base, quote } = splitSymbol(symbol);

  const chartStatus =
    connectionState === 'offline'
      ? { label: 'Updates paused', variant: 'warning' as const }
      : connectionState === 'reconnecting'
        ? { label: 'Reconnecting', variant: 'warning' as const }
        : connectionState === 'connecting'
          ? { label: 'Connecting', variant: 'neutral' as const }
          : liveTickStale
            ? { label: 'Stale', variant: 'warning' as const }
            : { label: 'Live', variant: 'positive' as const };

  const chartCandles = useMemo(() => candlesQuery.data ?? [], [candlesQuery.data]);
  const lastClose = chartCandles.at(-1)?.close;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      rightPriceScale: { borderColor: CHART_COLORS.border },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#4fd1c5' },
        horzLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#4fd1c5' },
      },
      localization: {
        timeFormatter: (time: Time) => {
          if (typeof time === 'number') {
            return formatLocalDateTime(new Date(time * 1000).toISOString());
          }
          return String(time);
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.positive,
      downColor: CHART_COLORS.negative,
      borderVisible: false,
      wickUpColor: CHART_COLORS.positive,
      wickDownColor: CHART_COLORS.negative,
      priceFormat: {
        type: 'price',
        precision: decimals,
        minMove: 1 / 10 ** decimals,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    latestCandleRef.current = null;
    dataKeyRef.current = null;

    const unsubscribe = useLiveRatesStore.subscribe(
      (state) => state.ticks[symbol],
      (tick) => {
        if (!tick || tick.stale) {
          return;
        }
        const price = Number(displayPrice(tick, ''));
        if (!Number.isFinite(price)) {
          return;
        }

        const time = candleBucket(tick.as_of, interval);
        const latest = latestCandleRef.current;
        if (!latest) {
          const candle: CandlestickData<Time> = {
            time,
            open: price,
            high: price,
            low: price,
            close: price,
          };
          latestCandleRef.current = candle;
          series.update(candle);
          return;
        }

        if (typeof latest.time !== 'number' || time < latest.time) {
          return;
        }

        const previousClose = latest.close;
        const candle: CandlestickData<Time> =
          time === latest.time
            ? {
                ...latest,
                high: Math.max(latest.high, price),
                low: Math.min(latest.low, price),
                close: price,
              }
            : {
                time,
                open: previousClose,
                high: Math.max(previousClose, price),
                low: Math.min(previousClose, price),
                close: price,
              };

        latestCandleRef.current = candle;
        series.update(candle);
      },
    );

    return () => {
      unsubscribe();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      latestCandleRef.current = null;
      dataKeyRef.current = null;
    };
  }, [decimals, interval, symbol]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) {
      return;
    }

    const data = chartCandles
      .map(toCandleData)
      .filter((candle) => Number.isFinite(candle.open) && Number.isFinite(candle.close));
    series.setData(data);
    latestCandleRef.current = data.at(-1) ?? null;

    const key = `${symbol}:${interval}`;
    if (data.length > 0 && dataKeyRef.current !== key) {
      dataKeyRef.current = key;
      chart.timeScale().fitContent();
    }
  }, [chartCandles, interval, symbol]);

  const hasData = chartCandles.length > 0;
  const showLoading = candlesQuery.isLoading && !hasData;
  const showError = candlesQuery.isError && !hasData;
  const showEmpty = !candlesQuery.isLoading && !candlesQuery.isError && !hasData;

  return (
    <section
      aria-labelledby={headingId}
      className="border-line bg-surface/90 overflow-hidden rounded-xl border"
    >
      <div className="border-line flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5">
        <div>
          <h2
            id={headingId}
            className="text-ink flex flex-wrap items-center gap-2 text-sm font-semibold"
          >
            {base}/{quote}
            <span className="border-line text-muted rounded border px-1.5 py-0.5 font-mono text-[9px] font-normal tracking-wide">
              CANDLES
            </span>
            <Badge variant={chartStatus.variant} dot>
              {chartStatus.label}
            </Badge>
          </h2>
          <p className="text-faint mt-0.5 text-[11px]">
            1m default · live candle updates from the tick stream
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChartLastPrice symbol={symbol} fallback={lastClose} decimals={decimals} />
          <div
            className="border-line bg-canvas/60 flex rounded-lg border p-0.5"
            role="group"
            aria-label="Chart interval"
          >
            {CHART_INTERVALS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={interval === option}
                onClick={() => setInterval(option)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors',
                  interval === option
                    ? 'bg-surface-hover text-ink'
                    : 'text-faint hover:text-ink disabled:opacity-40',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-[360px] min-h-[280px] sm:h-[420px]">
        <div
          ref={containerRef}
          data-testid="pair-chart"
          role="img"
          aria-label={`Candlestick chart for ${symbol}`}
          className="absolute inset-0"
        />
        {showLoading ? (
          <div className="bg-surface absolute inset-0 flex flex-col gap-3 p-4">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-full w-full" />
          </div>
        ) : null}
        {showError ? (
          <div className="bg-surface/92 absolute inset-0 flex items-center justify-center p-4">
            <StatePanel
              compact
              tone="error"
              title="Could not load candles"
              description={errorMessage(candlesQuery.error)}
              action={
                <Button size="sm" onClick={() => void candlesQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : null}
        {showEmpty ? (
          <div className="bg-surface/92 absolute inset-0 flex items-center justify-center p-4">
            <StatePanel
              compact
              title="No candles returned"
              description={`No ${interval} candles are available for ${symbol}.`}
            />
          </div>
        ) : null}
      </div>

      <div className="border-line text-faint flex items-center justify-between border-t px-4 py-2 text-[10px]">
        <span>
          {interval} candles · {chartCandles.length} bars
        </span>
        <span>Times shown in your local timezone</span>
      </div>
    </section>
  );
}
