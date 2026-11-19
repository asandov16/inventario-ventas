import type { SaleType } from './checkout';

/** Account status of a sale (v_sale_accounts): decided by the database. */
export type SaleStatus = 'cash' | 'paid' | 'pending' | 'overdue' | 'voided';

/** Installment status (v_installment_status). */
export type InstallmentStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'voided';

export type PaymentKind = 'cash' | 'down_payment' | 'payment' | 'legacy';

export interface SaleDetailItem {
  productId: string;
  productName: string;
  qty: number;
  unitPriceColones: number;
  subtotalColones: number;
}

export interface SaleDetailInstallment {
  number: number;
  dueDate: string;
  amountColones: number;
  /** How much of this installment is covered: payments fill them in order. */
  paidColones: number;
  status: InstallmentStatus;
}

export interface SaleDetailPayment {
  id: string;
  kind: PaymentKind;
  amountColones: number;
  paymentMethodName: string | null;
  receivedByName: string | null;
  clientCreatedAt: string;
}

export interface OtherSale {
  id: string;
  folio: number;
  type: SaleType;
  totalColones: number;
  balanceColones: number;
  status: SaleStatus;
  clientCreatedAt: string;
}

/** Everything the sale sheet shows (get_sale_detail, CU-04 to CU-07). */
export interface SaleDetail {
  id: string;
  folio: number;
  type: SaleType;
  source: 'app' | 'legacy_import';
  description: string | null;
  totalColones: number;
  months: number | null;
  downPaymentColones: number;
  clientCreatedAt: string;
  sellerName: string;
  paymentMethodName: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  status: SaleStatus;
  paidColones: number;
  balanceColones: number;
  progressPct: number;
  nextDueDate: string | null;
  nextDueAmountColones: number | null;
  overdueColones: number;
  customer: { id: string; name: string; phoneE164: string; whatsappOptIn: boolean };
  items: SaleDetailItem[];
  installments: SaleDetailInstallment[];
  payments: SaleDetailPayment[];
  lastReminder: { createdAt: string; sentByName: string | null } | null;
  customerSummary: {
    balanceColones: number;
    overdueColones: number;
    openSales: number;
    otherSales: OtherSale[];
  };
}

/** Units that go back to the inventory when the sale is voided (RN-11). */
export function unitsOf(sale: Pick<SaleDetail, 'items'>): number {
  return sale.items.reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Money the business already received for this sale. Voiding does not return it
 * on its own: the void dialog warns about it (F5-T03).
 */
export function receivedColones(sale: Pick<SaleDetail, 'payments'>): number {
  return sale.payments.reduce((sum, payment) => sum + payment.amountColones, 0);
}

export const VOID_REASONS = ['error', 'return', 'other'] as const;
export type VoidReasonChoice = (typeof VOID_REASONS)[number];

/** The reason stored with the void; "Otro" needs the person's own words. */
export function voidReasonText(
  choice: VoidReasonChoice | null,
  otherText: string,
  labels: Record<Exclude<VoidReasonChoice, 'other'>, string>,
): string | null {
  if (choice === null) return null;
  if (choice === 'other') {
    const text = otherText.trim().replace(/\s+/g, ' ');
    return text === '' ? null : text;
  }
  return labels[choice];
}
