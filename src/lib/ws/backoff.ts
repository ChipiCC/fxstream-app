export interface BackoffOptions {
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export function computeBackoffDelay(
  attempt: number,
  options: BackoffOptions,
  random: () => number = Math.random,
): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (safeAttempt - 1));
  const jitter = exponential * options.jitterRatio * Math.min(1, Math.max(0, random()));
  return Math.min(options.maxDelayMs, Math.round(exponential + jitter));
}
