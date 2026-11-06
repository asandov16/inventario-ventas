import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { showToast } from '@/shared/hooks/feedback';

import {
  canAdd,
  cartLines,
  cartReducer,
  cartTotals,
  EMPTY_CART,
  parseSavedCart,
  quantityOf,
} from '../domain/cart';
import type { CatalogProduct } from '../domain/catalog';
import { SALES_MESSAGES } from '../messages.es';

const STORAGE_KEY = 'sales-cart';

function loadCart() {
  try {
    return parseSavedCart(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_CART;
  }
}

/**
 * The cart of the sale in progress (F4-T02). Kept in sessionStorage so it
 * survives a reload or a failed save, and reconciled with every fresh catalog.
 */
export function useCart(products: readonly CatalogProduct[]) {
  const [cart, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable (private mode): the cart still works in memory.
    }
  }, [cart]);

  useEffect(() => {
    if (products.length > 0) dispatch({ type: 'reconcile', products });
  }, [products]);

  const add = useCallback(
    (product: CatalogProduct) => {
      if (!canAdd(cart, product)) {
        showToast('error', SALES_MESSAGES.noMoreUnits(product.name));
        return;
      }
      dispatch({ type: 'add', product });
    },
    [cart],
  );

  const decrement = useCallback((productId: string) => {
    dispatch({ type: 'decrement', productId });
  }, []);

  const clear = useCallback((options: { silent?: boolean } = {}) => {
    dispatch({ type: 'clear' });
    if (!options.silent) showToast('info', SALES_MESSAGES.cartCleared);
  }, []);

  const lines = useMemo(() => cartLines(cart, products), [cart, products]);
  const totals = useMemo(() => cartTotals(lines), [lines]);

  return {
    lines,
    ...totals,
    quantityOf: (productId: string) => quantityOf(cart, productId),
    add,
    decrement,
    clear,
  };
}

export type CartApi = ReturnType<typeof useCart>;
