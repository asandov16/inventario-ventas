import { describe, expect, it } from 'vitest';

import { categoriesOf, filterInventory, unitMargin, type InventoryProduct } from './inventory';

function product(overrides: Partial<InventoryProduct>): InventoryProduct {
  return {
    id: 'p1',
    code: 'PER-001',
    name: 'Rosa Imperial',
    categoryId: 'per',
    categoryName: 'Perfumes',
    priceColones: 38000,
    stock: 6,
    minStock: 3,
    stockStatus: 'ok',
    ...overrides,
  };
}

const products = [
  product({ id: 'p1', name: 'Rosa Imperial', code: 'PER-001' }),
  product({ id: 'p2', name: 'Ámbar Nocturno', code: 'PER-002', stock: 2, stockStatus: 'low' }),
  product({
    id: 'b3',
    name: 'Pulsera tejida',
    code: 'BIS-003',
    categoryId: 'bis',
    categoryName: 'Bisutería',
    stock: 0,
    stockStatus: 'out',
  }),
];

const all = { query: '', categoryId: null, lowOnly: false };

describe('filterInventory', () => {
  it('lists by category, then by name', () => {
    expect(filterInventory(products, all).map((p) => p.id)).toEqual(['b3', 'p2', 'p1']);
  });

  it('finds by name without accents or by code', () => {
    expect(filterInventory(products, { ...all, query: 'ambar' }).map((p) => p.id)).toEqual(['p2']);
    expect(filterInventory(products, { ...all, query: 'bis-0' }).map((p) => p.id)).toEqual(['b3']);
  });

  it('filters by category', () => {
    expect(filterInventory(products, { ...all, categoryId: 'per' }).map((p) => p.id)).toEqual([
      'p2',
      'p1',
    ]);
  });

  it('"Stock bajo" keeps low and sold-out products (RN-10)', () => {
    expect(filterInventory(products, { ...all, lowOnly: true }).map((p) => p.id)).toEqual([
      'b3',
      'p2',
    ]);
  });
});

describe('categoriesOf', () => {
  it('returns each category once, alphabetically', () => {
    expect(categoriesOf(products)).toEqual([
      { id: 'bis', name: 'Bisutería' },
      { id: 'per', name: 'Perfumes' },
    ]);
  });
});

describe('unitMargin', () => {
  it('gives the profit and the margin over the price', () => {
    expect(unitMargin(38000, 19000)).toEqual({ profitColones: 19000, marginPct: 50 });
  });

  it('is unknown without a cost (a seller never receives one)', () => {
    expect(unitMargin(38000, null)).toBeNull();
  });

  it('can be negative when the price is below the cost', () => {
    expect(unitMargin(1000, 1500)).toEqual({ profitColones: -500, marginPct: -50 });
  });
});
