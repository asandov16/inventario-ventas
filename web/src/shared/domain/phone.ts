/**
 * Costa Rican phones are stored as E.164 (+506XXXXXXXX) and shown as 8000-0001.
 * The database normalizes too (create_customer); this is for input and display.
 */

const COUNTRY_CODE = '506';
const LOCAL_DIGITS = 8;

/** Returns +506XXXXXXXX, or null if the input is not 8 local digits (optionally prefixed by 506). */
export function toE164(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === COUNTRY_CODE.length + LOCAL_DIGITS && digits.startsWith(COUNTRY_CODE)) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  return digits.length === LOCAL_DIGITS ? `+${COUNTRY_CODE}${digits}` : null;
}

export function isValidPhone(input: string): boolean {
  return toE164(input) !== null;
}

/** "+50680000001" → "8000-0001". Anything unexpected is returned unchanged. */
export function formatPhone(e164: string): string {
  const local = toE164(e164)?.slice(-LOCAL_DIGITS);
  return local ? `${local.slice(0, 4)}-${local.slice(4)}` : e164;
}

/** Formats a phone while it is being typed: "80000" → "8000-0". */
export function formatPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, LOCAL_DIGITS);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

/** True when a search query looks like a phone (no letters), so it can prefill the phone field. */
export function looksLikePhone(query: string): boolean {
  return /\d/.test(query) && !/\p{L}/u.test(query);
}
