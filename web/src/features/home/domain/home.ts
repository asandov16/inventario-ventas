/** Inicio (CU-12, CU-13): what the screen shows, decided without React or the network. */

export type Greeting = 'morning' | 'afternoon' | 'evening';

/** "Buenos días" before noon, "Buenas tardes" until 7 p. m., then "Buenas noches". */
export function greetingFor(hour: number): Greeting {
  if (hour < 12) return 'morning';
  return hour < 19 ? 'afternoon' : 'evening';
}

/** The first name of "Ximena Ledezma". */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export interface DashboardSummary {
  salesTodayColones: number;
  sales30DaysColones: number;
  receivableColones: number;
  lowStockCount: number;
}

// ---- Actividad (F7-T02) ----

export type ActivityType =
  | 'sale'
  | 'legacy_balance'
  | 'payment'
  | 'void'
  | 'restock'
  | 'adjustment'
  | 'product_created'
  | 'customer_created'
  | 'reminder';

export interface ActivityEntry {
  id: number;
  type: ActivityType;
  entity: 'sale' | 'product' | 'customer';
  entityId: string;
  amountColones: number | null;
  data: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
}

const ICONS: Record<ActivityType, string> = {
  sale: '🛍️',
  legacy_balance: '📒',
  payment: '💵',
  void: '↩️',
  restock: '📦',
  adjustment: '✏️',
  product_created: '✨',
  customer_created: '👤',
  reminder: '💬',
};

export function activityIcon(type: ActivityType): string {
  return ICONS[type];
}

/** A text value from the entry's data, or null. */
export function dataText(entry: ActivityEntry, key: string): string | null {
  const value = entry.data[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

/** A number from the entry's data, or null. */
export function dataNumber(entry: ActivityEntry, key: string): number | null {
  const value = entry.data[key];
  return typeof value === 'number' ? value : null;
}

// ---- Estado (F7-T03) ----

export type AlertKind =
  'overdue_installment' | 'upcoming_installment' | 'out_of_stock' | 'low_stock';

export interface HomeAlert {
  kind: AlertKind;
  severity: 'urgent' | 'attention';
  entity: 'sale' | 'product';
  entityId: string;
  title: string;
  folio: number | null;
  amount: number | null;
  dueDate: string | null;
}

/** Urgent first; within a level, the soonest date, then by name (v_alerts has no order). */
export function sortAlerts(alerts: readonly HomeAlert[]): HomeAlert[] {
  return [...alerts].sort(
    (a, b) =>
      Number(b.severity === 'urgent') - Number(a.severity === 'urgent') ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      a.title.localeCompare(b.title, 'es'),
  );
}

// ---- Análisis (F7-T04) ----

export interface DailySales {
  date: string;
  cashColones: number;
  installmentsColones: number;
}

export interface Analytics {
  days: 7 | 30;
  soldColones: number;
  salesCount: number;
  averageSaleColones: number;
  collectedColones: number;
  /** Only with analytics.profit; null otherwise. */
  grossProfitColones: number | null;
  marginPct: number | null;
  daily: DailySales[];
  mix: { cashColones: number; installmentsColones: number };
  topProducts: { productId: string; name: string; qty: number; amountColones: number }[];
  byCategory: { category: string; amountColones: number }[];
}

export interface Bar {
  date: string;
  x: number;
  width: number;
  cash: { y: number; height: number };
  installments: { y: number; height: number };
  totalColones: number;
  /** Day label shown under the bar: every day for 7, every fifth for 30, and the last. */
  showLabel: boolean;
}

export interface BarChart {
  width: number;
  height: number;
  baseline: number;
  maxColones: number;
  bars: Bar[];
  /** Dashed reference lines at half and full scale. */
  gridLines: { y: number; valueColones: number }[];
}

const CHART_HEIGHT = 170;
const LABEL_SPACE = 22;
const TOP_SPACE = 8;

/** Geometry of the stacked bars "Ventas por día" (prototype v2): cash below, installments on top. */
export function buildBarChart(daily: readonly DailySales[], width = 640): BarChart {
  const maxColones = Math.max(1, ...daily.map((d) => d.cashColones + d.installmentsColones));
  const baseline = CHART_HEIGHT - LABEL_SPACE;
  const usable = baseline - TOP_SPACE;
  const slot = (width - 8) / Math.max(1, daily.length);
  const gap = daily.length > 10 ? 2 : 6;

  const bars = daily.map((day, index): Bar => {
    const x = 4 + index * slot + gap / 2;
    const cashHeight = (day.cashColones / maxColones) * usable;
    const installmentsHeight = (day.installmentsColones / maxColones) * usable;
    return {
      date: day.date,
      x,
      width: slot - gap,
      cash: { y: baseline - cashHeight, height: cashHeight },
      installments: { y: baseline - cashHeight - installmentsHeight, height: installmentsHeight },
      totalColones: day.cashColones + day.installmentsColones,
      showLabel: daily.length <= 7 || index % 5 === 0 || index === daily.length - 1,
    };
  });

  return {
    width,
    height: CHART_HEIGHT,
    baseline,
    maxColones,
    bars,
    gridLines: [0.5, 1].map((fraction) => ({
      y: baseline - fraction * usable,
      valueColones: Math.round(maxColones * fraction),
    })),
  };
}

/** Percent of each part, rounded, adding up to 100 (0 and 0 when nothing was sold). */
export function mixPercent(
  cash: number,
  installments: number,
): { cash: number; installments: number } {
  const total = cash + installments;
  if (total === 0) return { cash: 0, installments: 0 };
  const cashPct = Math.round((cash / total) * 100);
  return { cash: cashPct, installments: 100 - cashPct };
}
