import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { appConfig, splitSymbol } from '@/app/config';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, controlClassName } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { useRateDisplay } from '@/features/rates/hooks/useRateDisplay';
import { useLiveRatesStore } from '@/features/rates/store';
import type { Rate } from '@/features/rates/types';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { getServerNow, syncServerClock } from '@/lib/clock/serverClock';
import { formatPrice } from '@/lib/format/price';

import { useCreateQuote } from '../hooks/useCreateQuote';
import type { Quote, QuoteSide } from '../types';
import { QuoteCard } from './QuoteCard';

interface QuotePanelProps {
  symbol: string;
  rate: Rate | undefined;
  rateLoading: boolean;
  rateError: unknown;
}

function validateAmount(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed) || Number(trimmed) <= 0) {
    return 'Enter a positive decimal amount.';
  }
  return null;
}

export function QuotePanel({ symbol, rate, rateLoading, rateError }: QuotePanelProps) {
  const navigate = useNavigate();
  const display = useRateDisplay(symbol, rate);
  const connectionState = useLiveRatesStore((state) => state.connectionState);
  const [side, setSide] = useState<QuoteSide>('buy');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [quoteExpired, setQuoteExpired] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const mutation = useCreateQuote();

  useEffect(() => {
    if (!activeQuote) {
      return;
    }
    const expiresAt = Date.parse(activeQuote.expires_at);
    const remaining = Number.isNaN(expiresAt)
      ? 0
      : expiresAt - getServerNow() - appConfig.quoteSafetyMarginMs;
    const timer = window.setTimeout(() => setQuoteExpired(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [activeQuote]);

  const rateUnavailable = !rate && !display.hasLiveTick;
  const offline = connectionState === 'offline';
  const activeQuoteOpen = activeQuote !== null && !quoteExpired;

  const blockedReason = offline
    ? 'Quoting is paused while the live feed is offline.'
    : display.stale
      ? 'Quoting is disabled while this rate is stale.'
      : rateUnavailable
        ? rateLoading
          ? 'Waiting for the latest rate snapshot.'
          : rateError
            ? 'The rate snapshot is unavailable. Retry the rates table first.'
            : 'Waiting for a live rate.'
        : activeQuoteOpen
          ? 'A quote is already active. Wait for it to expire before requesting another.'
          : null;

  const submitDisabled = mutation.isPending || Boolean(blockedReason) || Boolean(amountError);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextAmountError = validateAmount(amount);
    setAmountError(nextAmountError);
    if (nextAmountError || blockedReason) {
      return;
    }

    setQuoteError(null);
    const startedAt = Date.now();
    const trimmedAmount = amount.trim();
    mutation.mutate(
      {
        symbol,
        side,
        ...(trimmedAmount ? { amount: trimmedAmount } : {}),
      },
      {
        onSuccess: (quote) => {
          syncServerClock(quote.issued_at, startedAt, Date.now());
          setQuoteExpired(false);
          setActiveQuote(quote);
        },
        onError: (error) => {
          setQuoteError(errorMessage(error));
        },
      },
    );
  };

  const handleSymbolChange = (nextSymbol: string) => {
    const { base, quote } = splitSymbol(nextSymbol);
    navigate(`/pair/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`);
  };

  return (
    <section
      aria-labelledby="quote-heading"
      className="border-line bg-surface/90 flex flex-col rounded-xl border"
    >
      <div className="border-line border-b px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="quote-heading" className="text-ink text-sm font-semibold">
              Request a quote
            </h2>
            <p className="text-faint mt-0.5 text-[11px]">
              Immutable bid/ask with a server-issued expiry
            </p>
          </div>
          <Badge variant="outline">30s TTL</Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Field label="Pair" htmlFor="quote-symbol">
          <select
            id="quote-symbol"
            className={controlClassName}
            value={symbol}
            onChange={(event) => handleSymbolChange(event.target.value)}
          >
            {appConfig.defaultSymbols.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <fieldset className="space-y-1.5">
            <legend className="text-muted text-xs font-medium">Side</legend>
            <div
              role="group"
              aria-label="Quote side"
              className="border-line bg-canvas/60 grid grid-cols-2 gap-1 rounded-lg border p-1"
            >
              {(['buy', 'sell'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={side === option}
                  onClick={() => setSide(option)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors',
                    side === option
                      ? option === 'buy'
                        ? 'bg-positive/15 text-positive'
                        : 'bg-negative/15 text-negative'
                      : 'text-muted hover:bg-surface-hover hover:text-ink',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <Field
            label="Amount"
            htmlFor="quote-amount"
            optional
            error={amountError ?? undefined}
            hint="Base asset, decimals only"
          >
            <input
              id="quote-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                if (amountError) {
                  setAmountError(validateAmount(event.target.value));
                }
              }}
              className={controlClassName}
            />
          </Field>
        </div>

        <div className="border-line bg-canvas/40 rounded-lg border px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-faint text-[10px] tracking-[0.12em] uppercase">Reference</span>
            <span className="text-ink font-mono text-sm tabular-nums">
              {formatPrice(display.price, display.decimals)}
            </span>
          </div>
          <div className="text-faint mt-1 flex items-center justify-between gap-3 text-[10px]">
            <span>{display.source ?? 'Waiting for source'}</span>
            {display.stale ? (
              <Badge variant="warning">Stale price</Badge>
            ) : (
              <span className="text-positive">Live reference</span>
            )}
          </div>
        </div>

        {blockedReason ? (
          <p className="border-warning/20 bg-warning/[0.055] text-warning rounded-lg border px-3 py-2 text-[11px] leading-4">
            {blockedReason}
          </p>
        ) : null}

        {quoteError ? (
          <p
            role="alert"
            className="border-negative/25 bg-negative/[0.06] text-negative rounded-lg border px-3 py-2 text-[11px] leading-4"
          >
            {quoteError}
          </p>
        ) : null}

        <Button
          data-testid="quote-submit"
          type="submit"
          variant="primary"
          className="w-full"
          disabled={submitDisabled}
        >
          {mutation.isPending ? <Spinner label="Requesting quote" /> : null}
          {mutation.isPending
            ? 'Requesting…'
            : activeQuote
              ? quoteExpired
                ? 'Request new quote'
                : 'Quote active'
              : 'Request quote'}
        </Button>
      </form>

      {activeQuote ? (
        <div className="border-line border-t p-4">
          <QuoteCard quote={activeQuote} decimals={display.decimals} />
        </div>
      ) : null}
    </section>
  );
}
