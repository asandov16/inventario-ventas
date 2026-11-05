import { addMonths } from './dates';

/**
 * Preview of an installment plan. Mirrors private.calc_installments in the
 * database (RN-03, RN-04, ADR-009, ADR-010) and is tested against the same
 * fixture (shared/fixtures/installments.cases.json, ADR-034).
 *
 * The database is the authority: this is only shown while the person fills
 * the form. After saving, the UI shows the plan the database returned.
 */

export const MAX_TERM_MONTHS = 3;
const ROUNDING_STEP_COLONES = 100;

export interface InstallmentInput {
  totalColones: number;
  downPaymentColones: number;
  months: number;
  /** Calendar day of the sale in the business time zone (YYYY-MM-DD). */
  saleDate: string;
  /** Only for legacy balances (ADR-012): due date of the first installment. */
  firstDueDate?: string;
}

export interface PlannedInstallment {
  number: number;
  dueDate: string;
  amountColones: number;
}

/** Same codes the database raises, so errors.ts has one message per code. */
export type InstallmentError = 'invalid_term' | 'invalid_down_payment' | 'term_too_long';

export type InstallmentPlan =
  | { ok: true; installments: PlannedInstallment[]; financedColones: number }
  | { ok: false; error: InstallmentError };

export function calcInstallments(input: InstallmentInput): InstallmentPlan {
  const { totalColones, downPaymentColones, months, saleDate, firstDueDate } = input;

  if (!Number.isInteger(months) || months < 1 || months > MAX_TERM_MONTHS) {
    return { ok: false, error: 'invalid_term' };
  }
  if (totalColones <= 0 || downPaymentColones < 0 || downPaymentColones >= totalColones) {
    return { ok: false, error: 'invalid_down_payment' };
  }

  const financedColones = totalColones - downPaymentColones;
  const each = Math.floor(financedColones / months / ROUNDING_STEP_COLONES) * ROUNDING_STEP_COLONES;
  if (each === 0) return { ok: false, error: 'term_too_long' };

  const installments: PlannedInstallment[] = [];
  for (let number = 1; number <= months; number++) {
    const isLast = number === months;
    installments.push({
      number,
      dueDate:
        firstDueDate === undefined
          ? addMonths(saleDate, number)
          : addMonths(firstDueDate, number - 1),
      amountColones: isLast ? financedColones - each * (months - 1) : each,
    });
  }
  return { ok: true, installments, financedColones };
}
