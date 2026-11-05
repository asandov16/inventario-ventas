import { describe, expect, it } from 'vitest';

import { formatPhone, formatPhoneInput, isValidPhone, looksLikePhone, toE164 } from './phone';

describe('toE164', () => {
  it.each([
    ['80000001', '+50680000001'],
    ['8000-0001', '+50680000001'],
    ['8000 0001', '+50680000001'],
    ['+506 8000-0001', '+50680000001'],
    ['50680000001', '+50680000001'],
  ])('normalizes %j', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(['', '8000-000', '8000-00011', '+1 555 000 0001', 'ocho'])('rejects %j', (input) => {
    expect(toE164(input)).toBeNull();
    expect(isValidPhone(input)).toBe(false);
  });
});

describe('formatPhone', () => {
  it('shows E.164 as 8000-0001', () => {
    expect(formatPhone('+50680000001')).toBe('8000-0001');
  });

  it('returns unexpected values unchanged', () => {
    expect(formatPhone('desconocido')).toBe('desconocido');
  });
});

describe('formatPhoneInput', () => {
  it.each([
    ['8', '8'],
    ['8000', '8000'],
    ['80000', '8000-0'],
    ['8000-00011', '8000-0001'],
  ])('formats %j while typing', (input, expected) => {
    expect(formatPhoneInput(input)).toBe(expected);
  });
});

describe('looksLikePhone', () => {
  it('detects digit-only queries', () => {
    expect(looksLikePhone('8000-00')).toBe(true);
    expect(looksLikePhone('Leonor')).toBe(false);
    expect(looksLikePhone('Ana 8000')).toBe(false);
  });
});
