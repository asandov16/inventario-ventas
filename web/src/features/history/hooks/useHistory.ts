import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import { fetchHistoryPage, fetchSellers } from '../api/historyRepository';
import { cursorAfter, type HistoryFilter } from '../domain/history';

/** Historial pages under the sales prefix: any sale, payment or void refreshes them. */
export function useSalesHistory(filter: HistoryFilter) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.sales(), 'history', filter],
    queryFn: ({ pageParam }) => fetchHistoryPage(filter, pageParam),
    initialPageParam: null as ReturnType<typeof cursorAfter>,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? cursorAfter(lastPage.sales) : undefined),
  });
}

export function useSellers(enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: fetchSellers,
    enabled,
    staleTime: 10 * 60_000,
  });
}
