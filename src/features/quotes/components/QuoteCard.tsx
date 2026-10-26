import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { countdownProgress, formatCountdown } from '@/lib/format/countdown';
import { formatPrice } from '@/lib/format/price';
import { formatLocalTime, formatUtcTitle } from '@/lib/format/time';

import { useQuoteCountdown } from '../hooks/useQuoteCountdown';
import type { Quote } from '../types';

interface QuoteCardProps {
  quote: Quote;
  decimals: number;
}

function priceBlock(label: string, value: string, decimals: number, emphasis = false) {
  return (
    <div>
      <dt className="text-faint text-[10px] tracking-[0.12em] uppercase">{label}</dt>
      <dd
        className={cn(
          'mt-1 font-mono tabular-nums',
          emphasis ? 'text-ink text-lg font-semibold' : 'text-muted text-sm',
        )}
      >
        {formatPrice(value, decimals)}
      </dd>
    </div>
  );
}

export function QuoteCard({ quote, decimals }: QuoteCardProps) {
  const { remainingMs, totalMs, expired } = useQuoteCountdown(quote);
  const progress = countdownProgress(remainingMs, totalMs);

  return (
    <div
      data-testid="quote-card"
      className={cn(
        'rounded-lg border p-4',
        expired ? 'border-negative/25 bg-negative/[0.035]' : 'border-line bg-canvas/45',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-ink text-sm font-semibold">
              {expired ? 'Expired quote' : 'Active quote'}
            </h3>
            <Badge variant={expired ? 'negative' : 'positive'} dot>
              {expired ? 'Expired' : 'Valid'}
            </Badge>
            {quote.side ? <Badge variant="outline">{quote.side.toUpperCase()}</Badge> : null}
          </div>
          <p className="text-faint mt-1 font-mono text-[10px]">
            {quote.quote_id.slice(0, 18)}
            {quote.quote_id.length > 18 ? '…' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-faint text-[10px] tracking-[0.12em] uppercase">
            {expired ? 'Quote expired' : 'Expires in'}
          </p>
          <p
            data-testid="quote-countdown"
            className={cn(
              'mt-1 font-mono text-2xl font-semibold tabular-nums',
              expired ? 'text-negative' : 'text-accent',
            )}
            aria-label={
              expired ? 'Quote expired' : `Quote expires in ${formatCountdown(remainingMs)}`
            }
          >
            {expired ? 'Expired' : formatCountdown(remainingMs)}
          </p>
        </div>
      </div>

      <div className="bg-surface-hover mt-4 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            expired ? 'bg-negative/60' : 'bg-accent',
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {priceBlock('Bid', quote.bid, decimals)}
        {priceBlock('Mid', quote.mid, decimals, true)}
        {priceBlock('Ask', quote.ask, decimals)}
      </dl>

      <div className="border-line-subtle text-faint mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[10px]">
        <span>Spread {quote.spread_bps} bps</span>
        {quote.amount ? <span>Amount {quote.amount}</span> : null}
        <span title={formatUtcTitle(quote.issued_at)}>
          Issued {formatLocalTime(quote.issued_at)}
        </span>
        <span title={formatUtcTitle(quote.expires_at)}>
          Expires {formatLocalTime(quote.expires_at)}
        </span>
      </div>

      <p className="sr-only" role="status">
        {expired ? 'The quote has expired. Request a new quote to continue.' : ''}
      </p>
    </div>
  );
}
