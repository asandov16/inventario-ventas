import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';

/**
 * Tables published to Realtime (F2-T13, migration read_models). Cost tables are
 * deliberately not published; RLS still applies to every event.
 */
export const REALTIME_TABLES = [
  'sales',
  'payments',
  'products',
  'inventory_movements',
  'customers',
  'activity_log',
] as const;

export type RealtimeTable = (typeof REALTIME_TABLES)[number];

export type RealtimeStatus = 'connected' | 'disconnected';

/**
 * One channel per business with postgres_changes on the published tables
 * (F7-T06). Events only say which table changed: screens refetch what they
 * show, so the data never depends on the event payload. Returns the unsubscribe.
 */
export function subscribeToBusinessChanges(
  businessId: string,
  onChange: (table: RealtimeTable) => void,
  onStatus: (status: RealtimeStatus) => void,
): () => void {
  let channel = supabase.channel(`business:${businessId}`);
  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `business_id=eq.${businessId}` },
      () => {
        onChange(table);
      },
    );
  }
  channel.subscribe((status) => {
    onStatus(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED ? 'connected' : 'disconnected');
  });
  return () => {
    void supabase.removeChannel(channel);
  };
}
