import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';
import type { RpcCallContext } from '@/shared/api/useRpcMutation';

import type { Category } from '../domain/inventory';
import type {
  NewProductInput,
  RestockInput,
  SavedProduct,
  SimilarProduct,
  UpdateProductInput,
} from '../domain/stockForms';

/**
 * Inventory writes (CU-09 to CU-11): one RPC each, through useRpcMutation. Every
 * create carries the idempotency key; the database assigns the product code.
 */

const savedProductSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    stock: z.number().int(),
  })
  .transform((row): SavedProduct => ({
    id: row.id,
    code: row.code,
    name: row.name,
    stock: row.stock,
  }));

const restockResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.enum(['ok', 'replay']),
    product: savedProductSchema,
    stock_before: z.number().int(),
    stock_after: z.number().int(),
  }),
  z.object({
    status: z.literal('possible_duplicate'),
    existing: z.object({ qty: z.number().int(), created_at: z.string() }),
    product: savedProductSchema,
  }),
]);

export type RestockResponse = z.infer<typeof restockResponseSchema>;

export async function restockProduct(
  input: RestockInput,
  { idempotencyKey, confirmDuplicate }: RpcCallContext,
): Promise<RestockResponse> {
  const response = await callRpc('restock_product', {
    p_idempotency_key: idempotencyKey,
    p_product_id: input.productId,
    p_qty: input.qty,
    ...(input.unitCostColones !== null ? { p_unit_cost: input.unitCostColones } : {}),
    p_confirm_duplicate: confirmDuplicate,
  });
  return restockResponseSchema.parse(response);
}

const similarSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  stock: z.number().int(),
}) satisfies z.ZodType<SimilarProduct>;

const createResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.enum(['ok', 'replay']), product: savedProductSchema }),
  z.object({ status: z.literal('similar'), candidates: z.array(similarSchema) }),
]);

export type CreateProductResponse = z.infer<typeof createResponseSchema>;

export interface CreateProductRequest extends NewProductInput {
  /** True after the person chose "Crear nuevo de todos modos" (CU-10). */
  confirmSimilar: boolean;
}

export async function createProduct(
  input: CreateProductRequest,
  { idempotencyKey }: RpcCallContext,
): Promise<CreateProductResponse> {
  const response = await callRpc('create_product', {
    p_idempotency_key: idempotencyKey,
    // The id is generated on the device (D-05) and equals the key, so a retry
    // can never create a second product.
    p_id: idempotencyKey,
    p_name: input.name,
    p_category_id: input.categoryId,
    p_price: input.priceColones,
    p_min_stock: input.minStock,
    p_initial_qty: input.initialQty,
    // null is valid (no cost given); the generated type marks it required only
    // because the SQL parameter has no default.
    p_unit_cost: input.unitCostColones as unknown as number,
    p_confirm_similar: input.confirmSimilar,
  });
  return createResponseSchema.parse(response);
}

const updateResponseSchema = z.object({
  status: z.literal('ok'),
  product: savedProductSchema,
  stock_adjusted: z.object({ from: z.number().int(), to: z.number().int() }).nullable(),
  price_below_cost: z.boolean(),
});

export type UpdateProductResponse = z.infer<typeof updateResponseSchema>;

/** Edits are not idempotent by key: the version check refuses a stale second save. */
export async function updateProduct(input: UpdateProductInput): Promise<UpdateProductResponse> {
  const response = await callRpc('update_product', {
    p_product_id: input.productId,
    p_expected_version: input.expectedVersion,
    p_name: input.name,
    p_price: input.priceColones,
    p_min_stock: input.minStock,
    ...(input.unitCostColones !== null ? { p_unit_cost: input.unitCostColones } : {}),
    ...(input.countedStock !== null ? { p_counted_stock: input.countedStock } : {}),
    ...(input.active !== null ? { p_active: input.active } : {}),
  });
  return updateResponseSchema.parse(response);
}

const restockRowSchema = z.object({
  movement_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  type: z.enum(['initial', 'restock']),
  qty: z.number().int(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
});

export interface RecentRestock {
  id: string;
  productId: string;
  productName: string;
  type: 'initial' | 'restock';
  qty: number;
  createdByName: string | null;
  createdAt: string;
}

/** "Últimos ingresos" (v_recent_restocks): no costs travel here. */
export async function fetchRecentRestocks(limit = 5): Promise<RecentRestock[]> {
  const { data, error } = await supabase
    .from('v_recent_restocks')
    .select('movement_id, product_id, product_name, type, qty, created_by_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return z
    .array(restockRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.movement_id,
      productId: row.product_id,
      productName: row.product_name,
      type: row.type,
      qty: row.qty,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
    }));
}

const categoryRowSchema = z.object({ id: z.string(), name: z.string() });

/** Active categories in their configured order, for a new product. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('v_categories')
    .select('id, name')
    .eq('active', true)
    .order('sort');
  if (error) throw toAppError(error);
  return z.array(categoryRowSchema).parse(data);
}
