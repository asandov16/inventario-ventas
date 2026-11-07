import { describe, expect, it } from 'vitest';

import { reviewCheckout, type CheckoutDraft } from './checkout';

const draft = (overrides: Partial<CheckoutDraft> = {}): CheckoutDraft => ({
  saleType: 'cash',
  totalColones: 60000,
  units: 2,
  customerId: 'customer-1',
  paymentMethodId: 'cash',
  months: 3,
  downPaymentColones: 0,
  saleDate: '2026-11-02',
  ...overrides,
});

describe('reviewCheckout', () => {
  it('lets a complete cash sale through and receives the total today', () => {
    expect(reviewCheckout(draft())).toMatchObject({
      issue: null,
      receiveTodayColones: 60000,
      needsPaymentMethod: true,
    });
  });

  it('never registers without a customer (RN-01)', () => {
    expect(reviewCheckout(draft({ customerId: null })).issue).toBe('customer_required');
  });

  it('needs products', () => {
    expect(reviewCheckout(draft({ units: 0 })).issue).toBe('empty_cart');
  });

  it('needs a payment method for cash sales', () => {
    expect(reviewCheckout(draft({ paymentMethodId: null })).issue).toBe('payment_method_required');
  });

  it('previews the installment plan (RN-04) and receives the down payment today', () => {
    const review = reviewCheckout(
      draft({ saleType: 'installments', totalColones: 38500, downPaymentColones: 10000 }),
    );
    expect(review.issue).toBeNull();
    expect(review.receiveTodayColones).toBe(10000);
    expect(review.financedColones).toBe(28500);
    expect(review.plan.map((i) => [i.dueDate, i.amountColones])).toEqual([
      ['2026-12-02', 9500],
      ['2027-01-02', 9500],
      ['2027-02-02', 9500],
    ]);
  });

  it('a zero down payment needs no payment method', () => {
    const review = reviewCheckout(
      draft({ saleType: 'installments', paymentMethodId: null, downPaymentColones: 0 }),
    );
    expect(review).toMatchObject({ issue: null, needsPaymentMethod: false });
  });

  it('a down payment that covers the total suggests a cash sale (RN-05)', () => {
    expect(
      reviewCheckout(draft({ saleType: 'installments', downPaymentColones: 60000 })).issue,
    ).toBe('down_payment_covers_total');
  });

  it('rejects a plan with a ₡0 installment (D-10)', () => {
    expect(
      reviewCheckout(draft({ saleType: 'installments', totalColones: 200, months: 3 })).issue,
    ).toBe('term_too_long');
  });
});
