import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';
import type { RpcCallContext } from '@/shared/api/useRpcMutation';

import type { ReceivableAccount, ReceivablesSummary } from '../domain/receivables';

const accountSchema = z
  .object({
    sale_id: z.string(),
    folio: z.number().int(),
    customer_name: z.string(),
    customer_phone_e164: z.string(),
    source: z.enum(['app', 'legacy_import']),
    total: z.number().int(),
    paid: z.number().int(),
    balance: z.number().int(),
    status: z.enum(['paid', 'pending', 'overdue']),
    progress_pct: z.number().int(),
    next_due_date: z.string().nullable(),
    next_due_amount: z.number().int().nullable(),
    overdue_amount: z.number().int(),
    last_reminder_at: z.string().nullable(),
  })
  .transform((row): ReceivableAccount => ({
    saleId: row.sale_id,
    folio: row.folio,
    customerName: row.customer_name,
    customerPhoneE164: row.customer_phone_e164,
    source: row.source,
    totalColones: row.total,
    paidColones: row.paid,
    balanceColones: row.balance,
    status: row.status,
    progressPct: row.progress_pct,
    nextDueDate: row.next_due_date,
    nextDueAmountColones: row.next_due_amount,
    overdueColones: row.overdue_amount,
    lastReminderAt: row.last_reminder_at,
  }));

/** The 500 most recent installment accounts; the list sorts and splits them (F5-T05). */
const ACCOUNTS_LIMIT = 500;

export async function fetchReceivables(): Promise<ReceivableAccount[]> {
  const { data, error } = await supabase
    .from('v_receivables')
    .select(
      'sale_id, folio, customer_name, customer_phone_e164, source, total, paid, balance, status, progress_pct, next_due_date, next_due_amount, overdue_amount, last_reminder_at',
    )
    .order('client_created_at', { ascending: false })
    .limit(ACCOUNTS_LIMIT);
  if (error) throw toAppError(error);
  return z.array(accountSchema).parse(data);
}

const summarySchema = z.object({
  status: z.literal('ok'),
  receivable_total: z.number().int(),
  overdue_total: z.number().int(),
  due_next_7_days: z.number().int(),
});

/** The three numbers (get_receivables_summary, RF-COB-01). */
export async function fetchReceivablesSummary(): Promise<ReceivablesSummary> {
  const row = summarySchema.parse(await callRpc('get_receivables_summary', {}));
  return {
    receivableColones: row.receivable_total,
    overdueColones: row.overdue_total,
    dueNext7DaysColones: row.due_next_7_days,
  };
}

export interface PaymentInput {
  saleId: string;
  amountColones: number;
  paymentMethodId: string;
}

const paymentResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    payment: z.object({ id: z.string(), amount: z.number().int() }),
    balance: z.number().int(),
    paid_off: z.boolean(),
  }),
  z.object({
    status: z.literal('replay'),
    payment: z.object({ id: z.string(), amount: z.number().int() }),
    sale: z.object({ balance: z.number().int() }),
  }),
  z.object({
    status: z.literal('possible_duplicate'),
    existing: z.object({ amount: z.number().int(), created_at: z.string() }),
  }),
]);

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

/**
 * Registers a payment (CU-06, register_payment). The id is generated on the
 * device (D-05) and equals the idempotency key, so a retry never pays twice.
 */
export async function registerPayment(
  input: PaymentInput,
  { idempotencyKey, confirmDuplicate }: RpcCallContext,
): Promise<PaymentResponse> {
  const response = await callRpc('register_payment', {
    p_idempotency_key: idempotencyKey,
    p_id: idempotencyKey,
    p_client_created_at: new Date().toISOString(),
    p_sale_id: input.saleId,
    p_amount: input.amountColones,
    p_payment_method_id: input.paymentMethodId,
    p_confirm_duplicate: confirmDuplicate,
  });
  return paymentResponseSchema.parse(response);
}

const reminderResponseSchema = z.object({
  status: z.literal('ok'),
  reminder: z.object({ id: z.string(), created_at: z.string() }),
});

/** Records a reminder the person confirmed they sent through WhatsApp (CU-07, record_reminder). */
export async function recordReminder(
  saleId: string,
): Promise<z.infer<typeof reminderResponseSchema>> {
  return reminderResponseSchema.parse(
    await callRpc('record_reminder', { p_sale_id: saleId, p_channel: 'whatsapp_link' }),
  );
}
