import { describe, expect, it } from 'vitest';

import { keysForTables } from './useRealtimeSync';

describe('keysForTables (F7-T06)', () => {
  it('a sale refreshes history, accounts, totals, alerts, counters and stock', () => {
    const keys = keysForTables(['sales']).map((key) => JSON.stringify(key));
    expect(keys).toEqual(
      expect.arrayContaining([
        '["sales"]',
        '["receivables"]',
        '["summary"]',
        '["alerts"]',
        '["badge-counts"]',
        '["products"]',
      ]),
    );
  });

  it('refreshes each key once when several tables change together', () => {
    const keys = keysForTables(['sales', 'payments', 'activity_log']).map((key) =>
      JSON.stringify(key),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('["activity"]');
  });
});
