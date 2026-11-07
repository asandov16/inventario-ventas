import { describe, expect, it } from 'vitest';

import { categoriesOf, filterCatalog, type CatalogProduct } from './catalog';

const products: CatalogProduct[] = [
  {
    id: '1',
    code: 'PER-002',
    name: 'Ámbar Nocturno EDP 50 ml',
    categoryId: 'per',
    categoryName: 'Perfumes',
    priceColones: 26500,
    stock: 2,
  },
  {
    id: '2',
    code: 'BIS-001',
    name: 'Aretes argolla dorada',
    categoryId: 'bis',
    categoryName: 'Bisutería',
    priceColones: 6500,
    stock: 18,
  },
];

describe('filterCatalog', () => {
  it('finds by name without accents or case', () => {
    expect(filterCatalog(products, 'ambar', null).map((p) => p.id)).toEqual(['1']);
  });

  it('finds by code', () => {
    expect(filterCatalog(products, 'bis-001', null).map((p) => p.id)).toEqual(['2']);
  });

  it('filters by category', () => {
    expect(filterCatalog(products, '', 'per').map((p) => p.id)).toEqual(['1']);
  });

  it('returns everything with no filters', () => {
    expect(filterCatalog(products, '  ', null)).toHaveLength(2);
  });
});

describe('categoriesOf', () => {
  it('lists the categories that have products', () => {
    expect(categoriesOf(products)).toEqual([
      { id: 'per', name: 'Perfumes' },
      { id: 'bis', name: 'Bisutería' },
    ]);
  });
});
