import { describe, expect, it } from 'vitest';

import fixture from '../../../../shared/fixtures/installments.cases.json' with { type: 'json' };
import { calcInstallments } from './installments';

/**
 * Runs the shared fixture (ADR-034) against the TypeScript preview. pgTAP runs
 * the same cases against private.calc_installments, so both must agree.
 */
describe('calcInstallments matches the shared fixture', () => {
  it.each(fixture.cases)('$id', ({ input, expected }) => {
    const plan = calcInstallments({
      totalColones: input.total,
      downPaymentColones: input.downPayment,
      months: input.months,
      saleDate: input.saleDate,
      ...('firstDueDate' in input && typeof input.firstDueDate === 'string'
        ? { firstDueDate: input.firstDueDate }
        : {}),
    });

    if ('error' in expected) {
      expect(plan).toEqual({ ok: false, error: expected.error });
      return;
    }

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(
      plan.installments.map((i) => ({
        number: i.number,
        dueDate: i.dueDate,
        amount: i.amountColones,
      })),
    ).toEqual(expected.installments);
    const sum = plan.installments.reduce((total, i) => total + i.amountColones, 0);
    expect(sum).toBe(input.total - input.downPayment);
  });
});
