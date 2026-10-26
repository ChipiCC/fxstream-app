const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

interface ParsedDecimal {
  sign: 1 | -1;
  integer: string;
  fraction: string;
}

function parseDecimal(value: string): ParsedDecimal | null {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    sign: match[1] === '-' ? -1 : 1,
    integer: match[2] ?? '0',
    fraction: match[3] ?? '',
  };
}

function scaledValue(value: ParsedDecimal, scale: number): bigint {
  const digits = `${value.integer}${value.fraction.padEnd(scale, '0').slice(0, scale)}`;
  return BigInt(digits) * BigInt(value.sign);
}

function formatScaled(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '';
  const digits = (value < 0n ? -value : value).toString().padStart(scale + 1, '0');
  if (scale === 0) {
    return `${sign}${digits}`;
  }
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function decimalPlaces(value: string): number {
  return parseDecimal(value)?.fraction.length ?? 0;
}

export function normalizeDecimal(value: string): string | null {
  const parsed = parseDecimal(value);
  if (!parsed) {
    return null;
  }
  const sign = parsed.sign === -1 ? '-' : '';
  const integer = parsed.integer.replace(/^0+(?=\d)/, '');
  return `${sign}${integer}${parsed.fraction ? `.${parsed.fraction}` : ''}`;
}

export function midPrice(bid: string, ask: string): string {
  const parsedBid = parseDecimal(bid);
  const parsedAsk = parseDecimal(ask);
  if (!parsedBid || !parsedAsk) {
    return bid;
  }

  const scale = Math.max(parsedBid.fraction.length, parsedAsk.fraction.length);
  const sum = scaledValue(parsedBid, scale) + scaledValue(parsedAsk, scale);

  // Average at the smallest observed scale. If the sum is odd, the midpoint
  // needs one extra decimal place to avoid truncating half a unit.
  if (sum % 2n === 0n) {
    return formatScaled(sum / 2n, scale);
  }
  return formatScaled(sum * 5n, scale + 1);
}

export function compareDecimal(left: string, right: string): number | null {
  const parsedLeft = parseDecimal(left);
  const parsedRight = parseDecimal(right);
  if (!parsedLeft || !parsedRight) {
    return null;
  }

  const scale = Math.max(parsedLeft.fraction.length, parsedRight.fraction.length);
  const leftValue = scaledValue(parsedLeft, scale);
  const rightValue = scaledValue(parsedRight, scale);
  if (leftValue === rightValue) {
    return 0;
  }
  return leftValue > rightValue ? 1 : -1;
}
