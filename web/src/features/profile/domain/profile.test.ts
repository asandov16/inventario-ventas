import { describe, expect, it } from 'vitest';

import {
  isValidCatalogName,
  isValidPrefix,
  normalizePrefix,
  orderedPermissions,
  reviewPassword,
  sortCatalog,
} from './profile';

describe('reviewPassword (CU-14)', () => {
  it('needs 10 characters and the same confirmation', () => {
    expect(reviewPassword('corta', 'corta')).toBe('too_short');
    expect(reviewPassword('una-clave-larga', 'otra-clave-larga')).toBe('mismatch');
    expect(reviewPassword('una-clave-larga', 'una-clave-larga')).toBeNull();
  });
});

describe('orderedPermissions', () => {
  it('lists the known permissions in explanation order', () => {
    expect(
      orderedPermissions(new Set(['inventory.read', 'sales.create', 'something.new'])),
    ).toEqual(['sales.create', 'inventory.read']);
  });
});

describe('category prefixes and names (CU-15)', () => {
  it('normalizes what is typed to capital letters without accents', () => {
    expect(normalizePrefix(' bisutería ')).toBe('BISUT');
    expect(normalizePrefix('pé-r')).toBe('PER');
  });

  it('accepts 2 to 5 letters and names of 2 to 40 characters', () => {
    expect([isValidPrefix('P'), isValidPrefix('PE'), isValidPrefix('PERFU')]).toEqual([
      false,
      true,
      true,
    ]);
    expect([isValidCatalogName(' a '), isValidCatalogName('Relojes')]).toEqual([false, true]);
  });

  it('puts active items first, in their order', () => {
    expect(
      sortCatalog([
        { id: 'c', name: 'C', active: false, sort: 1 },
        { id: 'b', name: 'B', active: true, sort: 2 },
        { id: 'a', name: 'A', active: true, sort: 1 },
      ]).map((item) => item.id),
    ).toEqual(['a', 'b', 'c']);
  });
});
