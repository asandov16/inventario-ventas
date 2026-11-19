import { formatDayLabel, toBusinessDate } from '@/shared/domain/dates';
import { normalizeSearch } from '@/shared/domain/search';

/** Chips of Historial (F5-T01): "Todas" leaves voided sales out, "Anuladas" shows only those. */
export type HistoryKind = 'all' | 'cash' | 'installments' | 'voided';

export interface HistoryFilter {
  kind: HistoryKind;
  /** Customer name, phone digits or folio. */
  search: string;
  /** Business dates (YYYY-MM-DD), both inclusive (F5-T04). */
  fromDate: string | null;
  toDate: string | null;
  sellerId: string | null;
}

export const EMPTY_FILTER: HistoryFilter = {
  kind: 'all',
  search: '',
  fromDate: null,
  toDate: null,
  sellerId: null,
};

export type SaleStatus = 'cash' | 'paid' | 'pending' | 'overdue' | 'voided';

/** One row of v_sales_list. */
export interface HistorySale {
  id: string;
  folio: number;
  clientCreatedAt: string;
  customerName: string;
  sellerName: string;
  type: 'cash' | 'installments';
  source: 'app' | 'legacy_import';
  description: string | null;
  totalColones: number;
  balanceColones: number;
  status: SaleStatus;
  itemsCount: number;
}

/** Keyset cursor: (client_created_at desc, sale_id desc), stable while sales arrive. */
export interface HistoryCursor {
  clientCreatedAt: string;
  saleId: string;
}

export function cursorAfter(page: readonly HistorySale[]): HistoryCursor | null {
  const last = page.at(-1);
  return last ? { clientCreatedAt: last.clientCreatedAt, saleId: last.id } : null;
}

/** How the search box is read: digits search the folio and the phone, text the name. */
export type SearchTerm =
  { kind: 'none' } | { kind: 'number'; digits: string } | { kind: 'text'; text: string };

export function readSearch(search: string): SearchTerm {
  const trimmed = search.trim();
  const digits = trimmed.replace(/[\s#-]/g, '');
  if (trimmed === '') return { kind: 'none' };
  if (/^\d+$/.test(digits)) return { kind: 'number', digits };
  // Characters with a meaning in PostgREST filters are dropped, never sent.
  // Lowercase without accents, to match the view's customer_search column.
  const text = normalizeSearch(trimmed)
    .replace(/[,()*%\\"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text === '' ? { kind: 'none' } : { kind: 'text', text };
}

/** The day after a business date, for an inclusive "hasta" filter. */
export function nextDate(isoDate: string): string {
  const day = new Date(`${isoDate}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function isFiltered(filter: HistoryFilter): boolean {
  return (
    filter.kind !== 'all' ||
    filter.search.trim() !== '' ||
    filter.fromDate !== null ||
    filter.toDate !== null ||
    filter.sellerId !== null
  );
}

export interface DayGroup {
  key: string;
  label: string;
  /** Sum of the sales that count (voided ones do not). */
  totalColones: number;
  sales: HistorySale[];
}

/** Groups the loaded sales by business day: "Hoy", "Ayer", "2 nov" (F5-T01). */
export function groupByDay(sales: readonly HistorySale[], now: Date = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const sale of sales) {
    const instant = new Date(sale.clientCreatedAt);
    const key = toBusinessDate(instant);
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, label: formatDayLabel(instant, now), totalColones: 0, sales: [] };
      groups.push(group);
    }
    group.sales.push(sale);
    if (sale.status !== 'voided') group.totalColones += sale.totalColones;
  }
  return groups;
}
