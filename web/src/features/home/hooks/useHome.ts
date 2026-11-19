import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import {
  fetchActivityPage,
  fetchAlerts,
  fetchAnalytics,
  fetchBadgeCounts,
  fetchDashboardSummary,
} from '../api/homeRepository';

export function useDashboardSummary() {
  return useQuery({ queryKey: queryKeys.homeSummary(), queryFn: fetchDashboardSummary });
}

export function useActivity() {
  return useInfiniteQuery({
    queryKey: ['activity'],
    queryFn: ({ pageParam }) => fetchActivityPage(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.entries.at(-1)?.id ?? undefined) : undefined,
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts });
}

export function useAnalytics(days: 7 | 30) {
  return useQuery({ queryKey: ['analytics', days], queryFn: () => fetchAnalytics(days) });
}

/** For the tab bar (F7-T05); the shell shows them only when the user can read the dashboard. */
export function useBadgeCounts(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.badgeCounts(), queryFn: fetchBadgeCounts, enabled });
}
