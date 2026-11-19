import { describe, expect, it } from 'vitest';

import { reviewLegacyBalance, type LegacyBalanceDraft } from './legacyBalance';

const TODAY = '2026-11-19';
const draft: LegacyBalanceDraft = {
  customerId: 'c1',
  saleDate: '2026-09-20',
  description: 'Perfume Rosa + aretes',
  totalText: '50 000',
  paidText: '30 000',
  installments: 2,
  firstDueDate: '2026-11-30',
};

describe('reviewLegacyBalance (D-12, F7-T12)', () => {
  it('previews the plan on what is still owed, from the first due date', () => {
    const review = reviewLegacyBalance(draft, TODAY);
    expect(review.issues).toEqual({});
    expect(review.owedColones).toBe(20000);
    expect(review.plan?.map((i) => [i.dueDate, i.amountColones])).toEqual([
      ['2026-11-30', 10000],
      ['2026-12-30', 10000],
    ]);
    expect(review.input).toMatchObject({
      totalColones: 50000,
      paidColones: 30000,
      installments: 2,
    });
  });

  it('treats an empty "ha pagado" as ₡0', () => {
    expect(reviewLegacyBalance({ ...draft, paidText: '' }, TODAY).input?.paidColones).toBe(0);
  });

  it('refuses what the database refuses', () => {
    const review = reviewLegacyBalance(
      {
        customerId: null,
        saleDate: '2026-12-01',
        description: ' ',
        totalText: '20000',
        paidText: '20000',
        installments: null,
        firstDueDate: '',
      },
      TODAY,
    );
    expect(review.input).toBeNull();
    expect(review.issues).toEqual({
      customer: 'required',
      saleDate: 'future',
      description: 'required',
      paid: 'paid_covers_total',
      installments: 'required',
      firstDueDate: 'required',
    });
  });

  it('needs the first due date after the sale date', () => {
    expect(
      reviewLegacyBalance({ ...draft, firstDueDate: '2026-09-20' }, TODAY).issues.firstDueDate,
    ).toBe('before_sale');
  });
});
