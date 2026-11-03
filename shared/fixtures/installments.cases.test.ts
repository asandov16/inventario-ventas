import { describe, expect, it } from 'vitest';

import fixture from './installments.cases.json' with { type: 'json' };

/**
 * Guards the shared fixture itself, so that a typo here cannot make the SQL
 * and TypeScript implementations agree on a wrong answer. The implementations
 * are tested against this file in Stage 1 (pgTAP) and Stage 2 (Vitest).
 */

const KNOWN_ERRORS = new Set(['term_too_long', 'invalid_down_payment', 'invalid_term']);
const ROUNDING_STEP = 100;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Installment {
  number: number;
  dueDate: string;
  amount: number;
}

describe('installments.cases.json', () => {
  const ids = fixture.cases.map((c) => c.id);

  it('has unique, kebab-case ids', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('only uses known error codes', () => {
    for (const c of fixture.cases) {
      if ('error' in c.expected) expect(KNOWN_ERRORS.has(c.expected.error)).toBe(true);
    }
  });

  describe.each(fixture.cases.filter((c) => 'installments' in c.expected))('$id', (c) => {
    const installments = (c.expected as { installments: Installment[] }).installments;
    const financed = c.input.total - c.input.downPayment;

    it('has one installment per month, numbered from 1', () => {
      expect(installments.map((i) => i.number)).toEqual(
        Array.from({ length: c.input.months }, (_, index) => index + 1),
      );
    });

    it('sums exactly to total minus down payment', () => {
      expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBe(financed);
    });

    it('rounds every installment but the last to 100 colones', () => {
      for (const i of installments.slice(0, -1)) expect(i.amount % ROUNDING_STEP).toBe(0);
    });

    it('uses ISO dates in ascending order', () => {
      const dates = installments.map((i) => i.dueDate);
      for (const d of dates) expect(d).toMatch(ISO_DATE);
      expect([...dates].sort()).toEqual(dates);
    });
  });
});
