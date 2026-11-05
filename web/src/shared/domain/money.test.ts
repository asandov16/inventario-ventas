import { describe, expect, it } from 'vitest';

import { formatColones, parseColones } from './money';

const NBSP = ' ';

describe('formatColones', () => {
  it.each([
    [0, '₡0'],
    [950, '₡950'],
    [38000, `₡38${NBSP}000`],
    [1250000, `₡1${NBSP}250${NBSP}000`],
    [-16600, `-₡16${NBSP}600`],
  ])('formats %i as %s', (amount, expected) => {
    expect(formatColones(amount)).toBe(expected);
  });

  it('rejects fractional amounts (RN-13)', () => {
    expect(() => formatColones(10.5)).toThrow(RangeError);
  });
});

describe('parseColones', () => {
  it.each([
    ['15000', 15000],
    ['15 000', 15000],
    ['₡15.000', 15000],
    ['  0 ', 0],
  ])('reads %j as %i', (input, expected) => {
    expect(parseColones(input)).toBe(expected);
  });

  it('returns null when nothing numeric was typed', () => {
    expect(parseColones('')).toBeNull();
    expect(parseColones('₡')).toBeNull();
  });
});
