import { parseColones } from '@/shared/domain/money';

export type AccountStatus = 'paid' | 'pending' | 'overdue';

/** One installment account as Por cobrar lists it (v_receivables). */
export interface ReceivableAccount {
  saleId: string;
  folio: number;
  customerName: string;
  customerPhoneE164: string;
  source: 'app' | 'legacy_import';
  totalColones: number;
  paidColones: number;
  balanceColones: number;
  status: AccountStatus;
  progressPct: number;
  nextDueDate: string | null;
  nextDueAmountColones: number | null;
  overdueColones: number;
  lastReminderAt: string | null;
}

export interface ReceivablesSummary {
  receivableColones: number;
  overdueColones: number;
  dueNext7DaysColones: number;
}

/**
 * Pendientes (F5-T05): overdue first, then by the next due date, soonest first.
 * Liquidadas: everything paid off, most recent sale first.
 */
export function splitAccounts(accounts: readonly ReceivableAccount[]): {
  open: ReceivableAccount[];
  settled: ReceivableAccount[];
} {
  const open = accounts
    .filter((account) => account.balanceColones > 0)
    .sort(
      (a, b) =>
        Number(b.status === 'overdue') - Number(a.status === 'overdue') ||
        (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999') ||
        a.folio - b.folio,
    );
  const settled = accounts
    .filter((account) => account.balanceColones === 0)
    .sort((a, b) => b.folio - a.folio);
  return { open, settled };
}

/** Customers with something overdue (the "Vencido" number's hint). */
export function overdueCustomers(accounts: readonly ReceivableAccount[]): number {
  return new Set(
    accounts.filter((account) => account.overdueColones > 0).map((account) => account.customerName),
  ).size;
}

/** The facts of an account that decide what to collect. */
export interface CollectableAccount {
  balanceColones: number;
  overdueColones: number;
  nextDueAmountColones: number | null;
}

/** What one installment asks for now: the next one, never more than the balance. */
export function installmentAmount(account: CollectableAccount): number {
  return Math.min(account.nextDueAmountColones ?? account.balanceColones, account.balanceColones);
}

/**
 * Monto sugerido (F5-T06): what is overdue; if nothing is, the next installment;
 * never more than the balance.
 */
export function suggestedAmount(account: CollectableAccount): number {
  if (account.overdueColones > 0) return Math.min(account.overdueColones, account.balanceColones);
  return installmentAmount(account);
}

export type PaymentIssue = 'required' | 'not_a_number' | 'positive' | 'over_balance' | 'method';

/** Mirrors register_payment (RN-06): a number above ₡0, at most the balance, with a method. */
export function reviewPayment(
  amountText: string,
  balanceColones: number,
  paymentMethodId: string | null,
): { issue: PaymentIssue | null; amountColones: number | null } {
  if (amountText.trim() === '') return { issue: 'required', amountColones: null };
  if (!/^[\d\s₡.,]*$/.test(amountText)) return { issue: 'not_a_number', amountColones: null };
  const amount = parseColones(amountText);
  if (amount === null) return { issue: 'not_a_number', amountColones: null };
  if (amount <= 0) return { issue: 'positive', amountColones: null };
  if (amount > balanceColones) return { issue: 'over_balance', amountColones: null };
  if (!paymentMethodId) return { issue: 'method', amountColones: amount };
  return { issue: null, amountColones: amount };
}
