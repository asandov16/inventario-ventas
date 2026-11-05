import { describe, expect, it } from 'vitest';

import {
  addMonths,
  formatDayLabel,
  formatRelativeTime,
  formatShortDate,
  toBusinessDate,
} from './dates';

describe('toBusinessDate', () => {
  it('uses Costa Rica time, not UTC: 23:30 in CR is still the same day', () => {
    // 2026-11-03 23:30 in Costa Rica (UTC-6) is 2026-11-04 05:30 UTC.
    expect(toBusinessDate(new Date('2026-11-04T05:30:00Z'))).toBe('2026-11-03');
  });

  it('turns over at midnight in CR', () => {
    expect(toBusinessDate(new Date('2026-11-04T06:00:00Z'))).toBe('2026-11-04');
  });
});

describe('addMonths', () => {
  it.each([
    ['2026-11-02', 1, '2026-12-02'],
    ['2026-11-02', 2, '2027-01-02'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-11-30', 3, '2027-02-28'],
    ['2026-03-31', -1, '2026-02-28'],
  ])('%s + %i months = %s (ADR-009)', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });
});

describe('formatShortDate', () => {
  it('shows day and short month', () => {
    expect(formatShortDate('2026-12-02')).toBe('2 dic');
  });

  it('adds the year only when it differs from the reference', () => {
    expect(formatShortDate('2027-01-02', 2026)).toBe('2 ene 2027');
    expect(formatShortDate('2026-01-02', 2026)).toBe('2 ene');
  });
});

describe('formatDayLabel and formatRelativeTime', () => {
  const now = new Date('2026-11-03T18:00:00Z'); // 12:00 in CR

  it('says Hoy and Ayer in business time', () => {
    expect(formatDayLabel(new Date('2026-11-03T07:00:00Z'), now)).toBe('Hoy');
    expect(formatDayLabel(new Date('2026-11-03T05:00:00Z'), now)).toBe('Ayer');
    expect(formatDayLabel(new Date('2026-10-30T18:00:00Z'), now)).toBe('30 oct');
  });

  it('says how long ago something happened', () => {
    expect(formatRelativeTime(new Date('2026-11-03T17:59:30Z'), now)).toBe('Ahora');
    expect(formatRelativeTime(new Date('2026-11-03T17:55:00Z'), now)).toBe('hace 5 min');
    expect(formatRelativeTime(new Date('2026-11-03T15:00:00Z'), now)).toBe('hace 3 h');
    expect(formatRelativeTime(new Date('2026-11-02T18:00:00Z'), now)).toBe('Ayer');
  });
});
