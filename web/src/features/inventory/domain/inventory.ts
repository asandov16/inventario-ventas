import { normalizeSearch } from '@/shared/domain/search';

/** RN-10: low when stock is at or below the minimum, out when 0 (decided by v_products_status). */
export type StockStatus = 'ok' | 'low' | 'out';

/** A product as Inventario lists it (from v_products_status). */
export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  priceColones: number;
  stock: number;
  minStock: number;
  stockStatus: StockStatus;
}

/** Units and value of the active stock; value at cost only arrives with costs.read. */
export interface InventorySummary {
  units: number;
  valueAtPriceColones: number;
  valueAtCostColones: number | null;
}

export type MovementType = 'initial' | 'restock' | 'sale' | 'void' | 'adjustment';

export interface ProductMovement {
  id: string;
  type: MovementType;
  qtyDelta: number;
  stockAfter: number;
  reason: string | null;
  folio: number | null;
  createdByName: string | null;
  createdAt: string;
  /** Only with costs.read, and only for entries that carried a cost. */
  unitCostColones: number | null;
}

export interface ProductDetail extends InventoryProduct {
  active: boolean;
  version: number;
  unitsSold: number;
  /** Only with costs.read. */
  unitCostColones: number | null;
  movements: ProductMovement[];
}

export interface InventoryFilter {
  query: string;
  categoryId: string | null;
  lowOnly: boolean;
}

export interface Category {
  id: string;
  name: string;
}

/** Products matching the search (name or code), category and "Stock bajo", by category then name. */
export function filterInventory(
  products: readonly InventoryProduct[],
  { query, categoryId, lowOnly }: InventoryFilter,
): InventoryProduct[] {
  const needle = normalizeSearch(query);
  return products
    .filter(
      (product) =>
        (categoryId === null || product.categoryId === categoryId) &&
        (!lowOnly || product.stockStatus !== 'ok') &&
        (needle === '' ||
          normalizeSearch(product.name).includes(needle) ||
          normalizeSearch(product.code).includes(needle)),
    )
    .sort(
      (a, b) =>
        a.categoryName.localeCompare(b.categoryName, 'es') || a.name.localeCompare(b.name, 'es'),
    );
}

/** Categories that have at least one product, in alphabetical order. */
export function categoriesOf(products: readonly InventoryProduct[]): Category[] {
  const seen = new Map<string, Category>();
  for (const product of products) {
    if (!seen.has(product.categoryId)) {
      seen.set(product.categoryId, { id: product.categoryId, name: product.categoryName });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Margin per unit for the person who can see costs; null without a cost or a price. */
export function unitMargin(
  priceColones: number,
  unitCostColones: number | null,
): { profitColones: number; marginPct: number } | null {
  if (unitCostColones === null || priceColones <= 0) return null;
  const profitColones = priceColones - unitCostColones;
  return { profitColones, marginPct: Math.round((profitColones / priceColones) * 100) };
}
