import { calcInstallments, type PlannedInstallment } from '@/shared/domain/installments';

export type SaleType = 'cash' | 'installments';

export const TERM_OPTIONS = [1, 2, 3] as const;
export type TermMonths = (typeof TERM_OPTIONS)[number];

export interface CheckoutDraft {
  saleType: SaleType;
  totalColones: number;
  units: number;
  customerId: string | null;
  paymentMethodId: string | null;
  months: TermMonths;
  downPaymentColones: number;
  /** Calendar day of the sale in the business time zone (YYYY-MM-DD). */
  saleDate: string;
}

/** What stops the sale from being registered, in the order the person should fix it. */
export type CheckoutIssue =
  | 'empty_cart'
  | 'customer_required'
  | 'down_payment_covers_total'
  | 'term_too_long'
  | 'payment_method_required';

export interface CheckoutReview {
  issue: CheckoutIssue | null;
  /** Preview only; after saving, the plan the database returned is shown. */
  plan: PlannedInstallment[];
  receiveTodayColones: number;
  financedColones: number;
  /** A payment method is asked for: cash sales, or a down payment above ₡0. */
  needsPaymentMethod: boolean;
}

/** Mirrors the checks register_sale makes, so the button only enables when they pass. */
export function reviewCheckout(draft: CheckoutDraft): CheckoutReview {
  const isInstallments = draft.saleType === 'installments';
  const receiveTodayColones = isInstallments ? draft.downPaymentColones : draft.totalColones;
  const needsPaymentMethod = !isInstallments || draft.downPaymentColones > 0;

  let plan: PlannedInstallment[] = [];
  let financedColones = 0;
  let planIssue: CheckoutIssue | null = null;
  if (isInstallments && draft.totalColones > 0) {
    const result = calcInstallments({
      totalColones: draft.totalColones,
      downPaymentColones: draft.downPaymentColones,
      months: draft.months,
      saleDate: draft.saleDate,
    });
    if (result.ok) {
      plan = result.installments;
      financedColones = result.financedColones;
    } else {
      planIssue = result.error === 'term_too_long' ? 'term_too_long' : 'down_payment_covers_total';
    }
  }

  const issue: CheckoutIssue | null =
    draft.units === 0
      ? 'empty_cart'
      : draft.customerId === null
        ? 'customer_required'
        : (planIssue ??
          (needsPaymentMethod && draft.paymentMethodId === null
            ? 'payment_method_required'
            : null));

  return { issue, plan, receiveTodayColones, financedColones, needsPaymentMethod };
}
