/** A product as the sales catalog shows it (from v_products_status). */
export interface CatalogProduct {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  priceColones: number;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

/** Lowercase without accents, so "rosa" finds "Rosa" and "ambar" finds "Ámbar". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Products matching the search (name or code) and the selected category. */
export function filterCatalog(
  products: readonly CatalogProduct[],
  query: string,
  categoryId: string | null,
): CatalogProduct[] {
  const needle = normalizeSearch(query);
  return products.filter(
    (product) =>
      (categoryId === null || product.categoryId === categoryId) &&
      (needle === '' ||
        normalizeSearch(product.name).includes(needle) ||
        normalizeSearch(product.code).includes(needle)),
  );
}

/** Categories that have at least one product, in first-seen order. */
export function categoriesOf(products: readonly CatalogProduct[]): Category[] {
  const seen = new Map<string, Category>();
  for (const product of products) {
    if (!seen.has(product.categoryId)) {
      seen.set(product.categoryId, { id: product.categoryId, name: product.categoryName });
    }
  }
  return [...seen.values()];
}
