import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';
import type { RpcCallContext } from '@/shared/api/useRpcMutation';

import type { CatalogProduct, PaymentMethod } from '../domain/catalog';
import type { RegisterSaleInput, SavedSale } from '../domain/sale';

/** Reads go through views (CQRS-light); RLS limits them to the user's business. */

const productRowSchema = z.object({
  product_id: z.string(),
  code: z.string(),
  name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  price: z.number().int(),
  stock: z.number().int(),
});

const paymentMethodRowSchema = z.object({ id: z.string(), name: z.string() });

/** Active products for the sales catalog, sorted by name. */
export async function fetchCatalog(): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from('v_products_status')
    .select('product_id, code, name, category_id, category_name, price, stock')
    .eq('active', true)
    .order('name');
  if (error) throw toAppError(error);
  return z
    .array(productRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.product_id,
      code: row.code,
      name: row.name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      priceColones: row.price,
      stock: row.stock,
    }));
}

/** Active payment methods in their configured order (RN-14). */
export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('active', true)
    .order('sort');
  if (error) throw toAppError(error);
  return z.array(paymentMethodRowSchema).parse(data);
}

const installmentRowSchema = z.object({
  number: z.number().int(),
  due_date: z.string(),
  amount: z.number().int(),
});

const saleSchema = z
  .object({
    id: z.string(),
    folio: z.number().int(),
    type: z.enum(['cash', 'installments']),
    total: z.number().int(),
    months: z.number().int().nullable(),
    down_payment: z.number().int(),
    customer_name: z.string(),
    client_created_at: z.string(),
    installments: z.array(installmentRowSchema),
  })
  .transform((row): SavedSale => ({
    id: row.id,
    folio: row.folio,
    type: row.type,
    totalColones: row.total,
    months: row.months,
    downPaymentColones: row.down_payment,
    customerName: row.customer_name,
    clientCreatedAt: row.client_created_at,
    installments: row.installments
      .map((i) => ({ number: i.number, dueDate: i.due_date, amountColones: i.amount }))
      .sort((a, b) => a.number - b.number),
  }));

const registerResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), sale: saleSchema }),
  z.object({ status: z.literal('replay'), sale: saleSchema }),
  z.object({ status: z.literal('possible_duplicate'), existing: saleSchema }),
]);

export type RegisterSaleResponse = z.infer<typeof registerResponseSchema>;

/**
 * Registers the sale in one transaction (register_sale): stock, folio,
 * installments and payments are decided by the database. The expected total
 * lets it refuse the sale if a price changed meanwhile (total_changed).
 * The id is generated on the device (D-05) and equals the idempotency key, so
 * a retry can never create a second sale.
 */
export async function registerSale(
  input: RegisterSaleInput,
  { idempotencyKey, confirmDuplicate }: RpcCallContext,
): Promise<RegisterSaleResponse> {
  const isInstallments = input.saleType === 'installments';
  const response = await callRpc('register_sale', {
    p_idempotency_key: idempotencyKey,
    p_id: idempotencyKey,
    p_client_created_at: new Date().toISOString(),
    p_customer_id: input.customerId,
    p_type: input.saleType,
    p_items: input.items.map((item) => ({ product_id: item.productId, qty: item.quantity })),
    // null is valid here (installments with no down payment); the generated type
    // marks it required only because the SQL parameter has no default.
    p_payment_method_id: input.paymentMethodId as unknown as string,
    p_expected_total: input.expectedTotalColones,
    ...(isInstallments && input.months !== null ? { p_months: input.months } : {}),
    p_down_payment: isInstallments ? input.downPaymentColones : 0,
    p_confirm_duplicate: confirmDuplicate,
  });
  return registerResponseSchema.parse(response);
}

const storedSaleSchema = z.object({
  id: z.string(),
  folio: z.number().int(),
  type: z.enum(['cash', 'installments']),
  total: z.number().int(),
  months: z.number().int().nullable(),
  down_payment: z.number().int(),
  client_created_at: z.string(),
  customers: z.object({ name: z.string() }),
  installments: z.array(installmentRowSchema),
});

/** A sale read back by id (the detail sheet after a reload). RLS limits it to the business. */
export async function fetchSale(saleId: string): Promise<SavedSale> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, folio, type, total, months, down_payment, client_created_at, customers(name), installments(number, due_date, amount)',
    )
    .eq('id', saleId)
    .single();
  if (error) throw toAppError(error);
  const row = storedSaleSchema.parse(data);
  return saleSchema.parse({ ...row, customer_name: row.customers.name });
}
