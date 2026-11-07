import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { supabase } from '@/shared/api/supabaseClient';

import type { CatalogProduct, PaymentMethod } from '../domain/catalog';

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
