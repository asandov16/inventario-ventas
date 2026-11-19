import { z } from 'zod';

import { changePassword as changeAuthPassword } from '@/shared/api/auth';
import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';
import { businessDayStart } from '@/shared/domain/dates';

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
