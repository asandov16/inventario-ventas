import type { SaleType } from './checkout';

/** A sale as the database returned it after saving (register_sale, sale_json). */
export interface SavedSale {
  id: string;
  folio: number;
  type: SaleType;
  totalColones: number;
  months: number | null;
  downPaymentColones: number;
  customerName: string;
  clientCreatedAt: string;
  installments: { number: number; dueDate: string; amountColones: number }[];
  /** Known on this device right after saving; not stored on the sale itself. */
  paymentMethodName?: string;
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface RegisterSaleInput {
  customerId: string;
  saleType: SaleType;
  items: SaleItemInput[];
  paymentMethodId: string | null;
  expectedTotalColones: number;
  months: number | null;
  downPaymentColones: number;
}
