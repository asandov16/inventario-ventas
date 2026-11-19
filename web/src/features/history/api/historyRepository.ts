import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { supabase } from '@/shared/api/supabaseClient';
import { businessDayStart } from '@/shared/domain/dates';

import {
  nextDate,
  readSearch,
  type HistoryCursor,
  type HistoryFilter,
  type HistorySale,
} from '../domain/history';

export const PAGE_SIZE = 30;

const rowSchema = z
  .object({
    sale_id: z.string(),
    folio: z.number().int(),
    client_created_at: z.string(),
    customer_name: z.string(),
    seller_name: z.string(),
    type: z.enum(['cash', 'installments']),
    source: z.enum(['app', 'legacy_import']),
    description: z.string().nullable(),
    total: z.number().int(),
    balance: z.number().int(),
    status: z.enum(['cash', 'paid', 'pending', 'overdue', 'voided']),
    items_count: z.number().int(),
  })
  .transform((row): HistorySale => ({
    id: row.sale_id,
    folio: row.folio,
    clientCreatedAt: row.client_created_at,
    customerName: row.customer_name,
    sellerName: row.seller_name,
    type: row.type,
    source: row.source,
    description: row.description,
    totalColones: row.total,
    balanceColones: row.balance,
    status: row.status,
    itemsCount: row.items_count,
  }));

export interface HistoryPage {
  sales: HistorySale[];
  hasMore: boolean;
}

/**
 * One page of Historial from v_sales_list (CU-04): newest first, with keyset
 * paging so sales registered meanwhile never repeat or skip rows. Every filter
 * runs in the database.
 */
export async function fetchHistoryPage(
  filter: HistoryFilter,
  cursor: HistoryCursor | null,
): Promise<HistoryPage> {
  let query = supabase
    .from('v_sales_list')
    .select(
      'sale_id, folio, client_created_at, customer_name, seller_name, type, source, description, total, balance, status, items_count',
    );

  if (filter.kind === 'voided') query = query.not('voided_at', 'is', null);
  else query = query.is('voided_at', null);
  if (filter.kind === 'cash' || filter.kind === 'installments')
    query = query.eq('type', filter.kind);

  const search = readSearch(filter.search);
  if (search.kind === 'number') {
    const folio = Number(search.digits);
    query = query.or(
      Number.isSafeInteger(folio) && search.digits.length <= 9
        ? `folio.eq.${search.digits},customer_phone_e164.ilike.*${search.digits}*`
        : `customer_phone_e164.ilike.*${search.digits}*`,
    );
  } else if (search.kind === 'text') {
    query = query.like('customer_search', `%${search.text}%`);
  }

  if (filter.fromDate) query = query.gte('client_created_at', businessDayStart(filter.fromDate));
  if (filter.toDate) {
    query = query.lt('client_created_at', businessDayStart(nextDate(filter.toDate)));
  }
  if (filter.sellerId) query = query.eq('seller_id', filter.sellerId);

  if (cursor) {
    const at = `"${cursor.clientCreatedAt}"`;
    query = query.or(
      `client_created_at.lt.${at},and(client_created_at.eq.${at},sale_id.lt.${cursor.saleId})`,
    );
  }

  const { data, error } = await query
    .order('client_created_at', { ascending: false })
    .order('sale_id', { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (error) throw toAppError(error);

  const rows = z.array(rowSchema).parse(data);
  return { sales: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

const sellerSchema = z.object({ user_id: z.string(), full_name: z.string() });

export interface Seller {
  id: string;
  name: string;
}

/** People who can appear as sellers, for the filter; only listed with users.admin (v_users). */
export async function fetchSellers(): Promise<Seller[]> {
  const { data, error } = await supabase
    .from('v_users')
    .select('user_id, full_name')
    .order('full_name');
  if (error) throw toAppError(error);
  return z
    .array(sellerSchema)
    .parse(data)
    .map((row) => ({ id: row.user_id, name: row.full_name }));
}
