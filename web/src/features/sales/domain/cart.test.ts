import { describe, expect, it } from 'vitest';

import {
  canAdd,
  cartLines,
  cartReducer,
  cartTotals,
  EMPTY_CART,
  parseSavedCart,
  quantityOf,
  type Cart,
} from './cart';
import type { CatalogProduct } from './catalog';

const product = (id: string, stock: number, priceColones = 10000): CatalogProduct => ({
  id,
  code: id.toUpperCase(),
  name: `Producto ${id}`,
  categoryId: 'per',
  categoryName: 'Perfumes',
  priceColones,
  stock,
});

const rosa = product('per-001', 2, 38000);
const aretes = product('bis-001', 18, 6500);

describe('cartReducer', () => {
  it('adds one unit per tap', () => {
    let cart: Cart = EMPTY_CART;
    cart = cartReducer(cart, { type: 'add', product: rosa });
    cart = cartReducer(cart, { type: 'add', product: rosa });
    expect(quantityOf(cart, rosa.id)).toBe(2);
  });

  it('never goes over the stock (CU-01: "No hay más unidades")', () => {
    let cart: Cart = EMPTY_CART;
    for (let i = 0; i < 5; i++) cart = cartReducer(cart, { type: 'add', product: rosa });
    expect(quantityOf(cart, rosa.id)).toBe(2);
    expect(canAdd(cart, rosa)).toBe(false);
  });

  it('cannot add a sold-out product', () => {
    const soldOut = product('bis-003', 0);
    expect(cartReducer(EMPTY_CART, { type: 'add', product: soldOut })).toBe(EMPTY_CART);
  });

  it('removes the line when the quantity reaches zero', () => {
    let cart = cartReducer(EMPTY_CART, { type: 'add', product: rosa });
    cart = cartReducer(cart, { type: 'decrement', productId: rosa.id });
    expect(cart.quantities).toEqual({});
  });

  it('empties the cart', () => {
    const cart = cartReducer(EMPTY_CART, { type: 'add', product: rosa });
    expect(cartReducer(cart, { type: 'clear' })).toBe(EMPTY_CART);
  });

  it('caps quantities and drops products that left the catalog on a refresh', () => {
    let cart: Cart = { quantities: { [rosa.id]: 2, [aretes.id]: 3, gone: 1 } };
    cart = cartReducer(cart, { type: 'reconcile', products: [{ ...rosa, stock: 1 }, aretes] });
    expect(cart.quantities).toEqual({ [rosa.id]: 1, [aretes.id]: 3 });
  });

  it('keeps the same object when a refresh changes nothing', () => {
    const cart: Cart = { quantities: { [aretes.id]: 3 } };
    expect(cartReducer(cart, { type: 'reconcile', products: [aretes] })).toBe(cart);
  });
});

describe('cart lines and totals', () => {
  it('computes subtotals and the total in colones', () => {
    const cart: Cart = { quantities: { [rosa.id]: 1, [aretes.id]: 2 } };
    const lines = cartLines(cart, [rosa, aretes]);
    expect(lines.map((line) => line.subtotalColones)).toEqual([38000, 13000]);
    expect(cartTotals(lines)).toEqual({ units: 3, totalColones: 51000 });
  });
});

describe('parseSavedCart', () => {
  it('restores a cart kept in sessionStorage', () => {
    expect(parseSavedCart('{"quantities":{"a":2}}')).toEqual({ quantities: { a: 2 } });
  });

  it('ignores malformed data', () => {
    expect(parseSavedCart('not json')).toBe(EMPTY_CART);
    expect(parseSavedCart('{"quantities":{"a":-1,"b":1.5,"c":"2"}}')).toEqual({ quantities: {} });
    expect(parseSavedCart(null)).toBe(EMPTY_CART);
  });
});
