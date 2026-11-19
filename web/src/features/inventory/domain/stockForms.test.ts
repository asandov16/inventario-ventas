import { describe, expect, it } from 'vitest';

import {
  cleanName,
  editDraftFrom,
  parseQuantity,
  reviewNewProduct,
  reviewProductEdit,
  reviewRestock,
  type EditableProduct,
} from './stockForms';

describe('parseQuantity', () => {
  it('reads whole units and refuses anything else', () => {
    expect(parseQuantity(' 12 ')).toBe(12);
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('-3')).toBeNull();
    expect(parseQuantity('2.5')).toBeNull();
  });
});

describe('reviewRestock (CU-09)', () => {
  it('needs a product and a quantity above 0', () => {
    expect(reviewRestock({ productId: null, qtyText: '0', costText: '' }).issues).toEqual({
      product: 'required',
      qty: 'positive',
    });
  });

  it('refuses a cost with letters but accepts "₡15.000"', () => {
    expect(reviewRestock({ productId: 'p', qtyText: '3', costText: '15 mil' }).issues).toEqual({
      cost: 'not_a_number',
    });
    expect(reviewRestock({ productId: 'p', qtyText: '3', costText: '₡15.000' }).input).toEqual({
      productId: 'p',
      qty: 3,
      unitCostColones: 15000,
    });
  });

  it('leaves the cost out when it is empty', () => {
    expect(reviewRestock({ productId: 'p', qtyText: '12', costText: ' ' }).input).toEqual({
      productId: 'p',
      qty: 12,
      unitCostColones: null,
    });
  });
});

describe('reviewNewProduct (CU-10)', () => {
  const draft = {
    name: '  Perfume   Jazmín 50 ml ',
    categoryId: 'per',
    priceText: '24 000',
    minStockText: '3',
    qtyText: '12',
    costText: '',
  };

  it('builds the input with a clean name', () => {
    expect(reviewNewProduct(draft).input).toEqual({
      name: 'Perfume Jazmín 50 ml',
      categoryId: 'per',
      priceColones: 24000,
      minStock: 3,
      initialQty: 12,
      unitCostColones: null,
    });
  });

  it('lists every missing field', () => {
    const { issues, input } = reviewNewProduct({
      name: ' ',
      categoryId: null,
      priceText: '₡0',
      minStockText: '',
      qtyText: '',
      costText: 'abc',
    });
    expect(input).toBeNull();
    expect(issues).toEqual({
      name: 'required',
      category: 'required',
      price: 'positive',
      minStock: 'required',
      qty: 'required',
      cost: 'not_a_number',
    });
  });

  it('collapses spaces like the database', () => {
    expect(cleanName(' a   b ')).toBe('a b');
  });
});

describe('reviewProductEdit (CU-11)', () => {
  const product: EditableProduct = {
    id: 'p',
    version: 4,
    name: 'Collar perla cultivada',
    priceColones: 14500,
    minStock: 3,
    stock: 5,
    unitCostColones: 6000,
  };
  const unchanged = editDraftFrom(product);

  it('is not dirty until something changes', () => {
    expect(reviewProductEdit(product, unchanged).isDirty).toBe(false);
    expect(reviewProductEdit(product, { ...unchanged, minStockText: '2' }).isDirty).toBe(true);
  });

  it('sends only what changed: a new count is an adjustment, an unchanged cost is null', () => {
    const { input } = reviewProductEdit(product, { ...unchanged, stockText: '4' });
    expect(input).toMatchObject({
      expectedVersion: 4,
      countedStock: 4,
      unitCostColones: null,
      active: null,
    });
  });

  it('warns, without blocking, when the price is below the cost', () => {
    const review = reviewProductEdit(product, { ...unchanged, priceText: '5000' });
    expect(review.priceBelowCost).toBe(true);
    expect(review.input).not.toBeNull();
  });

  it('refuses a negative count, an empty minimum and a price of ₡0', () => {
    expect(
      reviewProductEdit(product, {
        ...unchanged,
        stockText: '-1',
        minStockText: '',
        priceText: '0',
      }).issues,
    ).toEqual({ stock: 'not_a_number', minStock: 'required', price: 'positive' });
  });
});
