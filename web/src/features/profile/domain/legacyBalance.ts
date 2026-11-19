import { calcInstallments, type PlannedInstallment } from '@/shared/domain/installments';
import { parseColones } from '@/shared/domain/money';

/**
 * Cargar saldo anterior (D-12, F7-T12): a debt from the paper notebook. The
 * checks mirror register_legacy_balance; the plan is the same calculation the
 * database makes (calc_installments on what is still owed), shown as a preview.
 */
export interface LegacyBalanceDraft {
  customerId: string | null;
  saleDate: string;
  description: string;
  totalText: string;
  paidText: string;
  installments: 1 | 2 | 3 | null;
  firstDueDate: string;
}

export interface LegacyBalanceInput {
  customerId: string;
  saleDate: string;
  description: string;
  totalColones: number;
  paidColones: number;
  installments: 1 | 2 | 3;
  firstDueDate: string;
}

/** What the database saved: the plan shown after saving is this one. */
export interface SavedLegacyBalance {
  status: 'ok' | 'replay';
  saleId: string;
  folio: number;
  customerName: string;
  balanceColones: number;
  installments: PlannedInstallment[];
}

export type LegacyField =
  'customer' | 'saleDate' | 'description' | 'total' | 'paid' | 'installments' | 'firstDueDate';

export type LegacyIssue =
  | 'required'
  | 'not_a_number'
  | 'positive'
  | 'paid_covers_total'
  | 'future'
  | 'before_sale'
  | 'term_too_long';

export interface LegacyReview {
  issues: Partial<Record<LegacyField, LegacyIssue>>;
  input: LegacyBalanceInput | null;
  /** Preview of what the database will save (null until it can be computed). */
  plan: PlannedInstallment[] | null;
  owedColones: number | null;
}

const MONEY_PATTERN = /^[\d\s₡.,]*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readMoney(text: string, required: boolean): number | LegacyIssue {
  if (text.trim() === '') return required ? 'required' : 0;
  if (!MONEY_PATTERN.test(text)) return 'not_a_number';
  return parseColones(text) ?? 'not_a_number';
}

export function reviewLegacyBalance(draft: LegacyBalanceDraft, today: string): LegacyReview {
  const issues: LegacyReview['issues'] = {};
  if (!draft.customerId) issues.customer = 'required';
  if (!ISO_DATE.test(draft.saleDate)) issues.saleDate = 'required';
  else if (draft.saleDate > today) issues.saleDate = 'future';
  if (draft.description.trim() === '') issues.description = 'required';

  const total = readMoney(draft.totalText, true);
  if (typeof total !== 'number') issues.total = total;
  else if (total <= 0) issues.total = 'positive';
  const paid = readMoney(draft.paidText, false);
  if (typeof paid !== 'number') issues.paid = paid;
  else if (typeof total === 'number' && total > 0 && paid >= total)
    issues.paid = 'paid_covers_total';

  if (draft.installments === null) issues.installments = 'required';
  if (!ISO_DATE.test(draft.firstDueDate)) issues.firstDueDate = 'required';
  else if (ISO_DATE.test(draft.saleDate) && draft.firstDueDate <= draft.saleDate) {
    issues.firstDueDate = 'before_sale';
  }

  const months = draft.installments;
  const canPlan =
    typeof total === 'number' &&
    typeof paid === 'number' &&
    total > 0 &&
    paid < total &&
    months !== null &&
    !issues.saleDate &&
    !issues.firstDueDate;

  let plan: PlannedInstallment[] | null = null;
  if (canPlan) {
    const result = calcInstallments({
      totalColones: total - paid,
      downPaymentColones: 0,
      months,
      saleDate: draft.saleDate,
      firstDueDate: draft.firstDueDate,
    });
    if (result.ok) plan = result.installments;
    else issues.installments = 'term_too_long';
  }

  const owedColones = typeof total === 'number' && typeof paid === 'number' ? total - paid : null;
  if (
    Object.keys(issues).length > 0 ||
    !draft.customerId ||
    typeof total !== 'number' ||
    typeof paid !== 'number' ||
    draft.installments === null
  ) {
    return { issues, input: null, plan, owedColones };
  }
  return {
    issues,
    plan,
    owedColones,
    input: {
      customerId: draft.customerId,
      saleDate: draft.saleDate,
      description: draft.description.trim().replace(/\s+/g, ' '),
      totalColones: total,
      paidColones: paid,
      installments: draft.installments,
      firstDueDate: draft.firstDueDate,
    },
  };
}
