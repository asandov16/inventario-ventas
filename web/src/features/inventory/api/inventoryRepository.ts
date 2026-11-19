import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';

import type {
  InventoryProduct,
  InventorySummary,
  ProductDetail,
  ProductMovement,
} from '../domain/inventory';

/**
 * Reads only. The list comes from v_products_status, which has no costs; costs
 * arrive solely through get_inventory_summary and get_product_detail, and only
 * for someone with costs.read (the database leaves them null for a seller).
 */

const stockStatusSchema = z.enum(['ok', 'low', 'out']);

const productFields = {
  code: z.string(),
  name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  price: z.number().int(),
  stock: z.number().int(),
  min_stock: z.number().int(),
  stock_status: stockStatusSchema,
};

const listRowSchema = z.object({ product_id: z.string(), ...productFields });

function toProduct(row: z.infer<typeof listRowSchema>): InventoryProduct {
  return {
    id: row.product_id,
    code: row.code,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    priceColones: row.price,
    stock: row.stock,
    minStock: row.min_stock,
    stockStatus: row.stock_status,
  };
}

/** Active products with their stock status (CU-08). */
export async function fetchInventory(): Promise<InventoryProduct[]> {
  const { data, error } = await supabase
    .from('v_products_status')
    .select(
      'product_id, code, name, category_id, category_name, price, stock, min_stock, stock_status',
    )
    .eq('active', true);
  if (error) throw toAppError(error);
  return z.array(listRowSchema).parse(data).map(toProduct);
}

const summarySchema = z.object({
  status: z.literal('ok'),
  units: z.number().int(),
  value_at_price: z.number().int(),
  value_at_cost: z.number().int().nullable(),
});

/** Units and value of the stock (get_inventory_summary). */
export async function fetchInventorySummary(): Promise<InventorySummary> {
  const row = summarySchema.parse(await callRpc('get_inventory_summary', {}));
  return {
    units: row.units,
    valueAtPriceColones: row.value_at_price,
    valueAtCostColones: row.value_at_cost,
  };
}

const movementSchema = z
  .object({
    id: z.string(),
    type: z.enum(['initial', 'restock', 'sale', 'void', 'adjustment']),
    qty_delta: z.number().int(),
    stock_after: z.number().int(),
    reason: z.string().nullable(),
    folio: z.number().int().nullable(),
    created_by_name: z.string().nullable(),
    created_at: z.string(),
    unit_cost: z.number().int().nullable(),
  })
  .transform((row): ProductMovement => ({
    id: row.id,
    type: row.type,
    qtyDelta: row.qty_delta,
    stockAfter: row.stock_after,
    reason: row.reason,
    folio: row.folio,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    unitCostColones: row.unit_cost,
  }));

const detailSchema = z.object({
  status: z.literal('ok'),
  product: z.object({
    id: z.string(),
    ...productFields,
    active: z.boolean(),
    version: z.number().int(),
    units_sold: z.number().int(),
    unit_cost: z.number().int().nullable(),
  }),
  movements: z.array(movementSchema),
});

/** A product with its units sold and its last movements (get_product_detail, F6-T02). */
export async function fetchProductDetail(productId: string): Promise<ProductDetail> {
  const { product, movements } = detailSchema.parse(
    await callRpc('get_product_detail', { p_product_id: productId }),
  );
  return {
    ...toProduct({ ...product, product_id: product.id }),
    active: product.active,
    version: product.version,
    unitsSold: product.units_sold,
    unitCostColones: product.unit_cost,
    movements,
  };
}
