export const CHART_INTERVALS = ['1m', '5m', '1h'] as const

export type ChartInterval = (typeof CHART_INTERVALS)[number]

export const INTERVAL_SECONDS: Record<ChartInterval, number> = {
  '1m': 60,
  '5m': 300,
  '1h': 3600,
}

export interface Candle {
  symbol: string
  interval: ChartInterval
  open: string
  high: string
  low: string
  close: string
  volume: string
  open_time: string
}
