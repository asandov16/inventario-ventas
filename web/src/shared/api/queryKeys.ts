/**
 * TanStack Query keys by domain (roadmap F3, data pattern). Writes invalidate
 * these prefixes so every screen showing the data refreshes.
 */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  products: () => ['products'] as const,
  // Under the products prefix, so anything that changes stock refreshes them too.
  inventory: () => ['products', 'inventory'] as const,
  inventorySummary: () => ['products', 'summary'] as const,
  product: (productId: string) => ['products', 'detail', productId] as const,
  recentRestocks: () => ['products', 'recent-restocks'] as const,
  categories: () => ['categories'] as const,
  paymentMethods: () => ['payment-methods'] as const,
  customers: (query: string) => ['customers', query] as const,
  sales: () => ['sales'] as const,
  sale: (saleId: string) => ['sale', saleId] as const,
  badgeCounts: () => ['badge-counts'] as const,
  homeSummary: () => ['summary', 'home'] as const,
} as const;
