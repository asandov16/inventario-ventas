import { z } from 'zod';

import { callRpc } from '@/shared/api/rpc';

import type { SaleDetail } from '../domain/saleDetail';

const saleStatus = z.enum(['cash', 'paid', 'pending', 'overdue', 'voided']);
const saleType = z.enum(['cash', 'installments']);
const money = z.number().int();

const detailSchema = z
  .object({
    status: z.literal('ok'),
    sale: z.object({
      id: z.string(),
      folio: z.number().int(),
      type: saleType,
      source: z.enum(['app', 'legacy_import']),
      description: z.string().nullable(),
      total: money,
      months: z.number().int().nullable(),
      down_payment: money,
      client_created_at: z.string(),
      seller_name: z.string(),
      payment_method_name: z.string().nullable(),
      voided_at: z.string().nullable(),
      voided_by_name: z.string().nullable(),
      void_reason: z.string().nullable(),
      status: saleStatus,
      paid: money,
      balance: money,
      progress_pct: z.number().int(),
      next_due_date: z.string().nullable(),
      next_due_amount: money.nullable(),
      overdue_amount: money,
      customer: z.object({
        id: z.string(),
        name: z.string(),
        phone_e164: z.string(),
        whatsapp_opt_in: z.boolean(),
      }),
      items: z.array(
        z.object({
          product_id: z.string(),
          product_name: z.string(),
          qty: z.number().int(),
          unit_price: money,
          subtotal: money,
        }),
      ),
      installments: z.array(
        z.object({
          number: z.number().int(),
          due_date: z.string(),
          amount: money,
          paid: money,
          status: z.enum(['paid', 'partial', 'pending', 'overdue', 'voided']),
        }),
      ),
      payments: z.array(
        z.object({
          id: z.string(),
          kind: z.enum(['cash', 'down_payment', 'payment', 'legacy']),
          amount: money,
          payment_method_name: z.string().nullable(),
          received_by_name: z.string().nullable(),
          client_created_at: z.string(),
        }),
      ),
      last_reminder: z
        .object({ created_at: z.string(), sent_by_name: z.string().nullable() })
        .nullable(),
    }),
    customer_summary: z.object({
      balance: money,
      overdue_amount: money,
      open_sales: z.number().int(),
      other_sales: z.array(
        z.object({
          id: z.string(),
          folio: z.number().int(),
          type: saleType,
          total: money,
          balance: money,
          status: saleStatus,
          client_created_at: z.string(),
        }),
      ),
    }),
  })
  .transform(({ sale, customer_summary: summary }): SaleDetail => ({
    id: sale.id,
    folio: sale.folio,
    type: sale.type,
    source: sale.source,
    description: sale.description,
    totalColones: sale.total,
    months: sale.months,
    downPaymentColones: sale.down_payment,
    clientCreatedAt: sale.client_created_at,
    sellerName: sale.seller_name,
    paymentMethodName: sale.payment_method_name,
    voidedAt: sale.voided_at,
    voidedByName: sale.voided_by_name,
    voidReason: sale.void_reason,
    status: sale.status,
    paidColones: sale.paid,
    balanceColones: sale.balance,
    progressPct: sale.progress_pct,
    nextDueDate: sale.next_due_date,
    nextDueAmountColones: sale.next_due_amount,
    overdueColones: sale.overdue_amount,
    customer: {
      id: sale.customer.id,
      name: sale.customer.name,
      phoneE164: sale.customer.phone_e164,
      whatsappOptIn: sale.customer.whatsapp_opt_in,
    },
    items: sale.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      qty: item.qty,
      unitPriceColones: item.unit_price,
      subtotalColones: item.subtotal,
    })),
    installments: sale.installments.map((installment) => ({
      number: installment.number,
      dueDate: installment.due_date,
      amountColones: installment.amount,
      paidColones: installment.paid,
      status: installment.status,
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      kind: payment.kind,
      amountColones: payment.amount,
      paymentMethodName: payment.payment_method_name,
      receivedByName: payment.received_by_name,
      clientCreatedAt: payment.client_created_at,
    })),
    lastReminder: sale.last_reminder
      ? { createdAt: sale.last_reminder.created_at, sentByName: sale.last_reminder.sent_by_name }
      : null,
    customerSummary: {
      balanceColones: summary.balance,
      overdueColones: summary.overdue_amount,
      openSales: summary.open_sales,
      otherSales: summary.other_sales.map((other) => ({
        id: other.id,
        folio: other.folio,
        type: other.type,
        totalColones: other.total,
        balanceColones: other.balance,
        status: other.status,
        clientCreatedAt: other.client_created_at,
      })),
    },
  }));

/** The sale sheet (get_sale_detail): one read with the plan, payments and the customer's other sales. */
export async function fetchSaleDetail(saleId: string): Promise<SaleDetail> {
  return detailSchema.parse(await callRpc('get_sale_detail', { p_sale_id: saleId }));
}

const voidResponseSchema = z.object({
  status: z.literal('ok'),
  returned_units: z.number().int(),
  received_amount: money,
});

export type VoidSaleResponse = z.infer<typeof voidResponseSchema>;

export interface VoidSaleInput {
  saleId: string;
  reason: string;
}

/**
 * Voids the sale (CU-05, void_sale): stock returns, the sale stops counting.
 * It has no idempotency key; a second void is refused with already_voided,
 * which names who voided it and when.
 */
export async function voidSale(input: VoidSaleInput): Promise<VoidSaleResponse> {
  return voidResponseSchema.parse(
    await callRpc('void_sale', { p_sale_id: input.saleId, p_reason: input.reason }),
  );
}
