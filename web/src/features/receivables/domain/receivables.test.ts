import { describe, expect, it } from 'vitest';

import {
  installmentAmount,
  overdueCustomers,
  reviewPayment,
  splitAccounts,
  suggestedAmount,
  type ReceivableAccount,
} from './receivables';

function account(overrides: Partial<ReceivableAccount>): ReceivableAccount {
  return {
    saleId: 's',
    folio: 1001,
    customerName: 'Marisol Ugalde',
    customerPhoneE164: '+50612300008',
    source: 'app',
    totalColones: 30000,
    paidColones: 10000,
    balanceColones: 20000,
    status: 'pending',
    progressPct: 33,
    nextDueDate: '2026-12-10',
    nextDueAmountColones: 10000,
    overdueColones: 0,
    lastReminderAt: null,
    ...overrides,
  };
}

describe('splitAccounts (F5-T05)', () => {
  it('puts overdue accounts first, then the soonest due date', () => {
    const { open, settled } = splitAccounts([
      account({ saleId: 'later', nextDueDate: '2026-12-20' }),
      account({ saleId: 'paid', balanceColones: 0, status: 'paid', nextDueDate: null }),
      account({ saleId: 'soon', nextDueDate: '2026-11-25' }),
      account({
        saleId: 'late',
        status: 'overdue',
        overdueColones: 5000,
        nextDueDate: '2026-11-05',
      }),
    ]);
    expect(open.map((a) => a.saleId)).toEqual(['late', 'soon', 'later']);
    expect(settled.map((a) => a.saleId)).toEqual(['paid']);
  });

  it('counts each customer with something overdue once', () => {
    expect(
      overdueCustomers([
        account({ overdueColones: 1, customerName: 'A' }),
        account({ overdueColones: 1, customerName: 'A' }),
        account({ overdueColones: 0, customerName: 'B' }),
      ]),
    ).toBe(1);
  });
});

describe('suggestedAmount (F5-T06)', () => {
  it('suggests what is overdue', () => {
    expect(
      suggestedAmount({
        balanceColones: 30000,
        overdueColones: 10000,
        nextDueAmountColones: 10000,
      }),
    ).toBe(10000);
  });

  it('otherwise the next installment, never more than the balance', () => {
    expect(
      suggestedAmount({ balanceColones: 4000, overdueColones: 0, nextDueAmountColones: 10000 }),
    ).toBe(4000);
    expect(
      installmentAmount({ balanceColones: 30000, overdueColones: 0, nextDueAmountColones: null }),
    ).toBe(30000);
  });
});

describe('reviewPayment (RN-06)', () => {
  it('accepts an amount up to the balance with a method', () => {
    expect(reviewPayment('₡5.000', 20000, 'm')).toEqual({ issue: null, amountColones: 5000 });
    expect(reviewPayment('20 000', 20000, 'm').issue).toBeNull();
  });

  it('refuses an empty, zero, lettered or larger amount, and a missing method', () => {
    expect(reviewPayment(' ', 20000, 'm').issue).toBe('required');
    expect(reviewPayment('0', 20000, 'm').issue).toBe('positive');
    expect(reviewPayment('5 mil', 20000, 'm').issue).toBe('not_a_number');
    expect(reviewPayment('25000', 20000, 'm').issue).toBe('over_balance');
    expect(reviewPayment('5000', 20000, null).issue).toBe('method');
  });
});
