import { useLiveRatesStore } from '@/features/rates/store';
import { formatLocalTime, formatUtcTitle } from '@/lib/format/time';

export function OfflineBanner() {
  const connectionState = useLiveRatesStore((state) => state.connectionState);
  const lastMessageAt = useLiveRatesStore((state) => state.lastMessageAt);

  if (connectionState !== 'offline') {
    return null;
  }

  return (
    <div
      data-testid="offline-banner"
      role="status"
      className="border-negative/25 bg-negative/10 text-negative border-b px-4 py-2 text-center text-xs"
    >
      <strong className="font-semibold">Live updates are paused.</strong> Last known values are
      still visible and may be out of date.
      {lastMessageAt ? (
        <span className="text-negative/75 ml-2">
          Last tick at{' '}
          <span title={formatUtcTitle(new Date(lastMessageAt).toISOString())}>
            {formatLocalTime(new Date(lastMessageAt).toISOString())}
          </span>
          .
        </span>
      ) : null}
    </div>
  );
}
