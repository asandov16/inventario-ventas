import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { showToast } from '@/shared/hooks/feedback';

import type { CatalogProduct } from '../domain/catalog';
import { SALES_MESSAGES } from '../messages.es';
import type { CartApi } from './useCart';

/** URL parameter that adds a product to the cart: /vender?agregar=<productId> (F6-T02). */
const ADD_PARAM = 'agregar';

/** Link that opens Vender with the product already in the cart (product detail → "Vender"). */
export function sellProductPath(productId: string): string {
  return `/vender?${ADD_PARAM}=${encodeURIComponent(productId)}`;
}

/**
 * Adds the product named in the link once the catalog has loaded, says so, and
 * removes the parameter so a reload or "back" never adds it again.
 */
export function useAddFromLink(products: readonly CatalogProduct[], cart: CartApi) {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get(ADD_PARAM);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (productId === null || products.length === 0 || handledRef.current === productId) return;
    handledRef.current = productId;

    const product = products.find((candidate) => candidate.id === productId);
    if (!product || product.stock === 0) {
      showToast('error', SALES_MESSAGES.productUnavailable);
    } else if (cart.quantityOf(product.id) < product.stock) {
      cart.add(product);
      showToast('ok', SALES_MESSAGES.addedFromLink(product.name));
    } else {
      showToast('error', SALES_MESSAGES.noMoreUnits(product.name));
    }

    const next = new URLSearchParams(searchParams);
    next.delete(ADD_PARAM);
    setSearchParams(next, { replace: true });
  }, [productId, products, cart, searchParams, setSearchParams]);
}
