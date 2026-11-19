import { z } from 'zod';

import { changePassword as changeAuthPassword } from '@/shared/api/auth';
import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';
import type { RpcCallContext } from '@/shared/api/useRpcMutation';
import { businessDayStart } from '@/shared/domain/dates';

import type { ExportData } from '../domain/backup';
import type { LegacyBalanceInput, SavedLegacyBalance } from '../domain/legacyBalance';
import type { CatalogItem } from '../domain/profile';

export interface MySales {
  count: number;
  totalColones: number;
}

/** "Mis ventas (30 días)": the person's own sales that count, from v_sales_list. */
export async function fetchMySales(userId: string, fromDate: string): Promise<MySales> {
  const { data, error } = await supabase
    .from('v_sales_list')
    .select('total')
    .eq('seller_id', userId)
    .eq('source', 'app')
    .is('voided_at', null)
    .gte('client_created_at', businessDayStart(fromDate));
  if (error) throw toAppError(error);
  const totals = z.array(z.object({ total: z.number().int() })).parse(data);
  return {
    count: totals.length,
    totalColones: totals.reduce((sum, row) => sum + row.total, 0),
  };
}

export const changePassword = changeAuthPassword;

const catalogRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string().optional(),
  active: z.boolean(),
  sort: z.number().int(),
});

/** All categories, active or not, for Perfil → Negocio (v_categories). */
export async function fetchAllCategories(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('v_categories')
    .select('id, name, prefix, active, sort')
    .order('sort');
  if (error) throw toAppError(error);
  return z.array(catalogRowSchema).parse(data);
}

/** All payment methods, active or not (v_payment_methods). */
export async function fetchAllPaymentMethods(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('v_payment_methods')
    .select('id, name, active, sort')
    .order('sort');
  if (error) throw toAppError(error);
  return z.array(catalogRowSchema).parse(data);
}

const okSchema = z.looseObject({ status: z.literal('ok') });

/** D-19: the business name lives in the database and changes from here. */
export async function updateBusinessName(name: string) {
  return okSchema.parse(await callRpc('update_business', { p_name: name }));
}

export interface CategoryInput {
  id: string | null;
  name: string;
  /** Only when creating; the code prefix of its products never changes afterwards. */
  prefix: string | null;
  active: boolean;
}

export async function saveCategory(input: CategoryInput) {
  return okSchema.parse(
    await callRpc('save_category', {
      p_name: input.name.trim(),
      p_active: input.active,
      ...(input.id ? { p_id: input.id } : {}),
      ...(input.prefix ? { p_prefix: input.prefix } : {}),
    }),
  );
}

export interface PaymentMethodInput {
  id: string | null;
  name: string;
  active: boolean;
}

export async function savePaymentMethod(input: PaymentMethodInput) {
  return okSchema.parse(
    await callRpc('save_payment_method', {
      p_name: input.name.trim(),
      p_active: input.active,
      ...(input.id ? { p_id: input.id } : {}),
    }),
  );
}

const userSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  role_name: z.string(),
  active: z.boolean(),
});

export interface BusinessUser {
  id: string;
  name: string;
  roleName: string;
  active: boolean;
}

/** Perfil → Usuarios (v_users, read-only, users.admin). */
export async function fetchUsers(): Promise<BusinessUser[]> {
  const { data, error } = await supabase
    .from('v_users')
    .select('user_id, full_name, role_name, active')
    .order('full_name');
  if (error) throw toAppError(error);
  return z
    .array(userSchema)
    .parse(data)
    .map((row) => ({
      id: row.user_id,
      name: row.full_name,
      roleName: row.role_name,
      active: row.active,
    }));
}

const rowsSchema = z.array(z.record(z.string(), z.unknown()));

const exportSchema = z.object({
  status: z.literal('ok'),
  generated_at: z.string(),
  business: z.object({ name: z.string() }),
  customers: rowsSchema,
  products: rowsSchema,
  sales: rowsSchema,
  sale_items: rowsSchema,
  installments: rowsSchema,
  payments: rowsSchema,
  inventory_movements: rowsSchema,
});

/** Perfil → Datos (F7-T09): everything for the backup file, from export_data (data.export). */
export async function fetchExportData(): Promise<ExportData> {
  const data = exportSchema.parse(await callRpc('export_data', {}));
  return {
    generatedAt: data.generated_at,
    businessName: data.business.name,
    customers: data.customers,
    products: data.products,
    sales: data.sales,
    saleItems: data.sale_items,
    installments: data.installments,
    payments: data.payments,
    movements: data.inventory_movements,
  };
}

export interface LegacySummary {
  count: number;
  totalColones: number;
}

/** "Saldos cargados: N · ₡X": legacy balances that still count (not voided). */
export async function fetchLegacySummary(): Promise<LegacySummary> {
  const { data, error } = await supabase
    .from('v_sales_list')
    .select('total')
    .eq('source', 'legacy_import')
    .is('voided_at', null);
  if (error) throw toAppError(error);
  const totals = z.array(z.object({ total: z.number().int() })).parse(data);
  return {
    count: totals.length,
    totalColones: totals.reduce((sum, row) => sum + row.total, 0),
  };
}

const legacyResponseSchema = z.object({
  status: z.enum(['ok', 'replay']),
  sale: z.object({
    id: z.string(),
    folio: z.number().int(),
    customer_name: z.string(),
    balance: z.number().int(),
    installments: z.array(
      z.object({ number: z.number().int(), due_date: z.string(), amount: z.number().int() }),
    ),
  }),
});

/** Cargar saldo anterior (D-12, F7-T12): the plan shown afterwards is the database's. */
export async function registerLegacyBalance(
  input: LegacyBalanceInput,
  context: RpcCallContext,
): Promise<SavedLegacyBalance> {
  const response = legacyResponseSchema.parse(
    await callRpc('register_legacy_balance', {
      p_idempotency_key: context.idempotencyKey,
      p_customer_id: input.customerId,
      p_sale_date: input.saleDate,
      p_description: input.description,
      p_total: input.totalColones,
      p_paid: input.paidColones,
      p_installments: input.installments,
      p_first_due_date: input.firstDueDate,
    }),
  );
  const { sale } = response;
  return {
    status: response.status,
    saleId: sale.id,
    folio: sale.folio,
    customerName: sale.customer_name,
    balanceColones: sale.balance,
    installments: sale.installments.map((installment) => ({
      number: installment.number,
      dueDate: installment.due_date,
      amountColones: installment.amount,
    })),
  };
}
