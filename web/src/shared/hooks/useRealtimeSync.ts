import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '../api/queryKeys';
import { subscribeToBusinessChanges, type RealtimeTable } from '../api/realtime';

/** How long to wait for more events before refreshing, so a burst refreshes once. */
export const REALTIME_DEBOUNCE_MS = 300;

const SALES_KEYS: readonly QueryKey[] = [
  queryKeys.sales(),
  ['sale'],
  ['receivables'],
  ['summary'],
  ['analytics'],
  ['alerts'],
  queryKeys.badgeCounts(),
];

/** Query key prefixes each table's changes can move (F7-T06). */
const KEYS_BY_TABLE: Record<RealtimeTable, readonly QueryKey[]> = {
  // A sale or a void also moves stock.
  sales: [...SALES_KEYS, queryKeys.products()],
  payments: SALES_KEYS,
  products: [queryKeys.products(), ['summary'], ['alerts'], queryKeys.badgeCounts()],
  inventory_movements: [queryKeys.products(), ['summary'], ['alerts'], queryKeys.badgeCounts()],
  customers: [['customers'], queryKeys.sales(), ['sale'], ['receivables']],
  activity_log: [['activity']],
};

/** The distinct key prefixes to refresh for the tables that changed. */
export function keysForTables(tables: Iterable<RealtimeTable>): QueryKey[] {
  const seen = new Map<string, QueryKey>();
  for (const table of tables) {
    for (const key of KEYS_BY_TABLE[table]) seen.set(JSON.stringify(key), key);
  }
  return [...seen.values()];
}

/**
 * Keeps every open device up to date (RNF-04): Realtime events refresh the
 * screens after a short wait, and coming back online or to the app refetches
 * everything, because events missed while asleep are never replayed.
 */
export function useRealtimeSync(businessId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const pending = new Set<RealtimeTable>();
    let timer: number | undefined;

    const flush = () => {
      timer = undefined;
      const keys = keysForTables(pending);
      pending.clear();
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    };

    let wasConnected = false;
    const unsubscribe = subscribeToBusinessChanges(
      businessId,
      (table) => {
        pending.add(table);
        window.clearTimeout(timer);
        timer = window.setTimeout(flush, REALTIME_DEBOUNCE_MS);
      },
      (status) => {
        // After a reconnection, whatever changed meanwhile is fetched again.
        if (status === 'connected' && wasConnected) void queryClient.invalidateQueries();
        if (status === 'connected') wasConnected = true;
      },
    );

    const refreshAll = () => {
      if (document.visibilityState === 'visible') void queryClient.invalidateQueries();
    };
    window.addEventListener('online', refreshAll);
    document.addEventListener('visibilitychange', refreshAll);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('online', refreshAll);
      document.removeEventListener('visibilitychange', refreshAll);
    };
  }, [businessId, queryClient]);
}
