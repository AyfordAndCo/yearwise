import { minorUnitScale } from '@yearwise/logic';

const MINUS_SIGNS = ['-', '\u2212'];

/**
 * Minor units to a plain decimal string, for a text input.
 *
 * Not `formatMoney`: an input wants digits and one separator, not a currency
 * symbol, grouping or a locale-specific decimal mark.
 */
export function toInputText(amountMinor: bigint, currency: string): string {
  const scale = minorUnitScale(currency);
  const negative = amountMinor < 0n;
  const absolute = negative ? -amountMinor : amountMinor;
  const divisor = 10n ** BigInt(scale);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;

  const body =
    scale === 0
      ? whole.toString()
      : `${whole.toString()}.${fraction.toString().padStart(scale, '0')}`;

  return negative ? `-${body}` : body;
}

/**
 * Splits an optional leading minus from the digits.
 *
 * `parseMoney` rejects a typed sign by design - sign comes from `kind` - so any
 * field that may be negative owns the sign itself and hands `parseMoney` a
 * magnitude.
 */
export function splitSign(text: string): { digits: string; negative: boolean } {
  const trimmed = text.trim();
  const negative = MINUS_SIGNS.some((sign) => trimmed.startsWith(sign));
  return { digits: negative ? trimmed.slice(1) : trimmed, negative };
}
