import { Link } from 'react-router';

import { splitSymbol } from '@/app/config';
import { Badge } from '@/components/ui/Badge';
import { useRateDisplay } from '@/features/rates/hooks/useRateDisplay';
import type { Rate } from '@/features/rates/types';
import { cn } from '@/lib/cn';
import { changeDirection, formatChangePercent, formatPrice } from '@/lib/format/price';
import { formatLocalTime, formatUtcTitle } from '@/lib/format/time';

interface RateRowProps {
  rate: Rate;
  selected: boolean;
}

export function RateRow({ rate, selected }: RateRowProps) {
  const display = useRateDisplay(rate.symbol, rate);
  const { base, quote } = splitSymbol(rate.symbol);
  const direction = changeDirection(display.changePct);
  const testIdSymbol = rate.symbol.replace('/', '-');

  return (
    <tr
      data-testid={`rate-row-${testIdSymbol}`}
      className={cn(
        'group border-line-subtle/70 border-b transition-colors last:border-0',
        selected ? 'bg-accent/[0.055]' : 'hover:bg-surface-raised/70',
      )}
    >
      <td className="px-4 py-3">
        <Link
          to={`/pair/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`}
          aria-current={selected ? 'true' : undefined}
          className="text-ink hover:text-accent flex items-center gap-2 font-medium transition-colors"
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              display.hasLiveTick && !display.stale ? 'bg-accent' : 'bg-faint/50',
            )}
            aria-hidden="true"
          />
          <span>{rate.symbol}</span>
          {selected ? (
            <span className="border-accent/30 text-accent rounded border px-1 py-0.5 text-[9px] tracking-wide uppercase">
              selected
            </span>
          ) : null}
          {display.stale ? (
            <Badge variant="warning" className="ml-1">
              Stale
            </Badge>
          ) : null}
        </Link>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          data-testid={`price-${testIdSymbol}`}
          className="text-ink font-mono text-[15px] font-medium tracking-tight tabular-nums"
        >
          {formatPrice(display.price, display.decimals)}
        </span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span
          data-testid={`change-${testIdSymbol}`}
          className={cn(
            'font-mono text-xs tabular-nums',
            direction === 'up' && 'text-positive',
            direction === 'down' && 'text-negative',
            direction === 'flat' && 'text-muted',
          )}
        >
          {direction === 'up' ? '▲ ' : null}
          {direction === 'down' ? '▼ ' : null}
          {formatChangePercent(display.changePct)}
        </span>
      </td>
      <td className="text-muted hidden px-4 py-3 text-right text-xs md:table-cell">
        {display.source ?? '—'}
      </td>
      <td
        className="text-faint hidden px-4 py-3 text-right font-mono text-[11px] tabular-nums sm:table-cell"
        title={formatUtcTitle(display.asOf)}
      >
        {formatLocalTime(display.asOf)}
      </td>
    </tr>
  );
}
