import { describe, expect, it } from 'vitest';

import {
  cursorAfter,
  EMPTY_FILTER,
  groupByDay,
  isFiltered,
  nextDate,
  readSearch,
  type HistorySale,
} from './history';

function sale(overrides: Partial<HistorySale>): HistorySale {
  return {
    id: 's1',
    folio: 1001,
    clientCreatedAt: '2026-11-19T15:00:00Z',
    customerName: 'Tamara Odio',
    sellerName: 'Bruno Arrieta',
    type: 'cash',
    source: 'app',
    description: null,
    totalColones: 13000,
    balanceColones: 0,
    status: 'cash',
    itemsCount: 2,
    ...overrides,
  };
}

// 19 nov 2026, 10:00 in Costa Rica.
const NOW = new Date('2026-11-19T16:00:00Z');

describe('groupByDay', () => {
  it('groups by business day with the total of what counts', () => {
    const groups = groupByDay(
      [
        sale({ id: 'a', clientCreatedAt: '2026-11-19T15:00:00Z', totalColones: 13000 }),
        sale({
          id: 'b',
          clientCreatedAt: '2026-11-19T14:00:00Z',
          status: 'voided',
          totalColones: 9000,
        }),
        // 18 nov, 23:30 in Costa Rica is 19 nov in UTC: still "Ayer".
        sale({ id: 'c', clientCreatedAt: '2026-11-19T05:30:00Z', totalColones: 9500 }),
        sale({ id: 'd', clientCreatedAt: '2026-11-02T18:00:00Z', totalColones: 38000 }),
      ],
      NOW,
    );
    expect(groups.map((g) => [g.label, g.totalColones, g.sales.length])).toEqual([
      ['Hoy', 13000, 2],
      ['Ayer', 9500, 1],
      ['2 nov', 38000, 1],
    ]);
  });
});

describe('readSearch', () => {
  it('reads a folio or phone as digits', () => {
    expect(readSearch(' #1003 ')).toEqual({ kind: 'number', digits: '1003' });
    expect(readSearch('1230-0003')).toEqual({ kind: 'number', digits: '12300003' });
  });

  it('reads a name and drops characters that would change the query', () => {
    expect(readSearch('Ana, (Célia)*')).toEqual({ kind: 'text', text: 'ana celia' });
    expect(readSearch('  ')).toEqual({ kind: 'none' });
  });
});

describe('cursor and filters', () => {
  it('continues after the last loaded sale', () => {
    expect(
      cursorAfter([
        sale({ id: 'x', clientCreatedAt: 't1' }),
        sale({ id: 'y', clientCreatedAt: 't0' }),
      ]),
    ).toEqual({
      clientCreatedAt: 't0',
      saleId: 'y',
    });
    expect(cursorAfter([])).toBeNull();
  });

  it('includes the whole "hasta" day', () => {
    expect(nextDate('2026-11-30')).toBe('2026-12-01');
  });

  it('knows when something is filtered', () => {
    expect(isFiltered(EMPTY_FILTER)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, kind: 'voided' })).toBe(true);
  });
});
