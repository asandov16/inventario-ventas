import type { CatalogProduct } from './catalog';

/**
 * The cart: quantity per product id. Pure functions so the rules are tested
 * without React. The cart never asks for more than the stock on screen
 * (CU-01); the database checks stock again when the sale is registered (RN-02).
 */
export interface Cart {
  quantities: Readonly<Record<string, number>>;
}

export const EMPTY_CART: Cart = { quantities: {} };

export type CartAction =
  | { type: 'add'; product: CatalogProduct }
  | { type: 'decrement'; productId: string }
  | { type: 'clear' }
  | { type: 'reconcile'; products: readonly CatalogProduct[] };

export function quantityOf(cart: Cart, productId: string): number {
  return cart.quantities[productId] ?? 0;
}

/** True when one more unit of the product fits in its stock. */
export function canAdd(cart: Cart, product: CatalogProduct): boolean {
  return quantityOf(cart, product.id) < product.stock;
}

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'add': {
      if (!canAdd(cart, action.product)) return cart;
      const next = quantityOf(cart, action.product.id) + 1;
      return { quantities: { ...cart.quantities, [action.product.id]: next } };
    }
    case 'decrement': {
      const next = quantityOf(cart, action.productId) - 1;
      const others = Object.entries(cart.quantities).filter(([id]) => id !== action.productId);
      return {
        quantities: Object.fromEntries(next > 0 ? [...others, [action.productId, next]] : others),
      };
    }
    case 'clear':
      return EMPTY_CART;
    case 'reconcile': {
      // Fresh catalog: drop products no longer for sale and cap to the new stock.
      const byId = new Map(action.products.map((product) => [product.id, product]));
      const quantities: Record<string, number> = {};
      let changed = false;
      for (const [productId, quantity] of Object.entries(cart.quantities)) {
        const capped = Math.min(quantity, byId.get(productId)?.stock ?? 0);
        if (capped !== quantity) changed = true;
        if (capped > 0) quantities[productId] = capped;
      }
      return changed ? { quantities } : cart;
    }
  }
}

export interface CartLine {
  product: CatalogProduct;
  quantity: number;
  subtotalColones: number;
}

/** Cart lines in catalog order, with subtotals. */
export function cartLines(cart: Cart, products: readonly CatalogProduct[]): CartLine[] {
  return products
    .filter((product) => quantityOf(cart, product.id) > 0)
    .map((product) => {
      const quantity = quantityOf(cart, product.id);
      return { product, quantity, subtotalColones: quantity * product.priceColones };
    });
}

export function cartTotals(lines: readonly CartLine[]) {
  return {
    units: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalColones: lines.reduce((sum, line) => sum + line.subtotalColones, 0),
  };
}

/** Restores a saved cart, ignoring anything malformed. */
export function parseSavedCart(saved: string | null): Cart {
  if (!saved) return EMPTY_CART;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null || !('quantities' in parsed)) {
      return EMPTY_CART;
    }
    const raw = parsed.quantities;
    if (typeof raw !== 'object' || raw === null) return EMPTY_CART;
    const quantities: Record<string, number> = {};
    for (const [productId, quantity] of Object.entries(raw)) {
      if (Number.isInteger(quantity) && typeof quantity === 'number' && quantity > 0) {
        quantities[productId] = quantity;
      }
    }
    return { quantities };
  } catch {
    return EMPTY_CART;
  }
}
