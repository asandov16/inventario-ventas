import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import { fetchSale } from '../api/salesRepository';

/** A sale by id: right after saving it comes from the cache, after a reload from the database. */
export function useSale(saleId: string | null) {
  return useQuery({
    queryKey: queryKeys.sale(saleId ?? ''),
    queryFn: () => fetchSale(saleId ?? ''),
    enabled: saleId !== null,
  });
}
