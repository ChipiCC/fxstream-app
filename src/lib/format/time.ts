const localTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

const utcFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'short',
});

export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? localTimeFormatter.format(date) : '—';
}

export function formatLocalDateTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? localDateTimeFormatter.format(date) : '—';
}

export function formatUtc(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? utcFormatter.format(date) : '—';
}

export function formatUtcTitle(value: string | null | undefined): string {
  return formatUtc(value);
}
