/**
 * Money is always integer colones (RN-13). Formatting is done by hand instead
 * of Intl so the output is identical in every browser: "₡38 000".
 */

/** Non-breaking space keeps "₡38 000" on one line. */
const GROUP_SEPARATOR = ' ';
const COLON_SIGN = '₡';

export function formatColones(amountColones: number): string {
  if (!Number.isInteger(amountColones)) {
    throw new RangeError(`Money must be whole colones, got ${String(amountColones)}`);
  }
  const sign = amountColones < 0 ? '-' : '';
  const digits = String(Math.abs(amountColones));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return `${sign}${COLON_SIGN}${grouped}`;
}

/**
 * Parses what a person types in an amount field ("15 000", "₡15.000", "15000")
 * into whole colones. Returns null when there is nothing numeric to read.
 */
export function parseColones(input: string): number | null {
  const digits = input.replace(/\D/g, '');
  if (digits === '') return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
