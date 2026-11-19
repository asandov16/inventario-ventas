import { z } from 'zod';

import { toAppError } from '@/shared/api/errors';
import { callRpc } from '@/shared/api/rpc';
import { supabase } from '@/shared/api/supabaseClient';

import type { ActivityEntry, Analytics, DashboardSummary, HomeAlert } from '../domain/home';

const money = z.number().int();

const summarySchema = z.object({
  status: z.literal('ok'),
  sales_today: money,
  sales_30_days: money,
  receivable_total: money,
  low_stock_count: z.number().int(),
});

/** The four numbers of Inicio (get_dashboard_summary, RF-DSH-01). */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const row = summarySchema.parse(await callRpc('get_dashboard_summary', {}));
  return {
    salesTodayColones: row.sales_today,
    sales30DaysColones: row.sales_30_days,
    receivableColones: row.receivable_total,
    lowStockCount: row.low_stock_count,
  };
}

const activitySchema = z
  .object({
    id: z.number().int(),
    type: z.enum([
      'sale',
      'legacy_balance',
      'payment',
      'void',
      'restock',
      'adjustment',
      'product_created',
      'customer_created',
      'reminder',
    ]),
    entity: z.enum(['sale', 'product', 'customer']),
    entity_id: z.string(),
    amount: money.nullable(),
    data: z.record(z.string(), z.unknown()),
    actor_name: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((row): ActivityEntry => ({
    id: row.id,
    type: row.type,
    entity: row.entity,
    entityId: row.entity_id,
    amountColones: row.amount,
    data: row.data,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }));

export const ACTIVITY_PAGE_SIZE = 30;

export interface ActivityPage {
  entries: ActivityEntry[];
  hasMore: boolean;
}

/** Actividad (v_activity, F7-T02): newest first; the cursor is the last id (it only grows). */
export async function fetchActivityPage(beforeId: number | null): Promise<ActivityPage> {
  let query = supabase
    .from('v_activity')
    .select('id, type, entity, entity_id, amount, data, actor_name, created_at');
  if (beforeId !== null) query = query.lt('id', beforeId);
  const { data, error } = await query
    .order('id', { ascending: false })
    .limit(ACTIVITY_PAGE_SIZE + 1);
  if (error) throw toAppError(error);
  const rows = z.array(activitySchema).parse(data);
  return { entries: rows.slice(0, ACTIVITY_PAGE_SIZE), hasMore: rows.length > ACTIVITY_PAGE_SIZE };
}

const alertSchema = z
  .object({
    kind: z.enum(['overdue_installment', 'upcoming_installment', 'out_of_stock', 'low_stock']),
    severity: z.enum(['urgent', 'attention']),
    entity: z.enum(['sale', 'product']),
    entity_id: z.string(),
    title: z.string(),
    folio: z.number().int().nullable(),
    amount: z.number().int().nullable(),
    due_date: z.string().nullable(),
  })
  .transform((row): HomeAlert => ({
    kind: row.kind,
    severity: row.severity,
    entity: row.entity,
    entityId: row.entity_id,
    title: row.title,
    folio: row.folio,
    amount: row.amount,
    dueDate: row.due_date,
  }));

/** Estado (v_alerts, CU-12). */
export async function fetchAlerts(): Promise<HomeAlert[]> {
  const { data, error } = await supabase
    .from('v_alerts')
    .select('kind, severity, entity, entity_id, title, folio, amount, due_date');
  if (error) throw toAppError(error);
  return z.array(alertSchema).parse(data);
}

const analyticsSchema = z
  .object({
    status: z.literal('ok'),
    days: z.union([z.literal(7), z.literal(30)]),
    sold: money,
    sales_count: z.number().int(),
    average_sale: money,
    collected: money,
    gross_profit: money.nullable().optional(),
    margin_pct: z.number().nullable().optional(),
    daily: z.array(z.object({ date: z.string(), cash: money, installments: money })),
    mix: z.object({ cash: money, installments: money }),
    top_products: z.array(
      z.object({ product_id: z.string(), name: z.string(), qty: z.number().int(), amount: money }),
    ),
    by_category: z.array(z.object({ category: z.string(), amount: money })),
  })
  .transform((row): Analytics => ({
    days: row.days,
    soldColones: row.sold,
    salesCount: row.sales_count,
    averageSaleColones: row.average_sale,
    collectedColones: row.collected,
    grossProfitColones: row.gross_profit ?? null,
    marginPct: row.margin_pct ?? null,
    daily: row.daily.map((day) => ({
      date: day.date,
      cashColones: day.cash,
      installmentsColones: day.installments,
    })),
    mix: { cashColones: row.mix.cash, installmentsColones: row.mix.installments },
    topProducts: row.top_products.map((product) => ({
      productId: product.product_id,
      name: product.name,
      qty: product.qty,
      amountColones: product.amount,
    })),
    byCategory: row.by_category.map((category) => ({
      category: category.category,
      amountColones: category.amount,
    })),
  }));

/** Análisis (get_analytics, CU-13): profit and margin come back only with analytics.profit. */
export async function fetchAnalytics(days: 7 | 30): Promise<Analytics> {
  return analyticsSchema.parse(await callRpc('get_analytics', { p_days: days }));
}

const badgeSchema = z.object({
  status: z.literal('ok'),
  overdue_accounts: z.number().int(),
  stock_alerts: z.number().int(),
});

export interface BadgeCounts {
  overdueAccounts: number;
  stockAlerts: number;
}

/** Red counters of the tab bar (get_badge_counts, RF-UX-04). */
export async function fetchBadgeCounts(): Promise<BadgeCounts> {
  const row = badgeSchema.parse(await callRpc('get_badge_counts', {}));
  return { overdueAccounts: row.overdue_accounts, stockAlerts: row.stock_alerts };
}
