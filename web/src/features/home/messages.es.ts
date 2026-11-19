// Spanish copy for the home feature (CU-12, CU-13, F7-T01 to T05, prototype v2).
export const HOME_MESSAGES = {
  title: 'Inicio',
  greeting: {
    morning: (name: string) => `Buenos días, ${name}`,
    afternoon: (name: string) => `Buenas tardes, ${name}`,
    evening: (name: string) => `Buenas noches, ${name}`,
  },
  salesToday: 'Ventas de hoy',
  sales30Days: 'Últimos 30 días',
  receivable: 'Por cobrar',
  lowStock: 'Stock bajo',
  lowStockHint: (count: number) => (count === 1 ? 'producto' : 'productos'),
  tabsLabel: 'Vista de Inicio',
  tabs: { activity: 'Actividad', status: 'Estado', analytics: 'Análisis' },

  // Actividad (F7-T02)
  activityEmptyTitle: 'Sin actividad todavía',
  activityEmptyBody: 'Las ventas, abonos y movimientos de inventario aparecerán aquí.',
  activityLoading: 'Cargando actividad…',
  activityMore: 'Ver más',
  activityMeta: (when: string, actor: string | null) => (actor ? `${when} · ${actor}` : when),
  activity: {
    sale: (folio: string, customer: string) => `Venta #${folio} a ${customer}`,
    legacy_balance: (customer: string) => `Saldo anterior de ${customer}`,
    payment: (customer: string, folio: string) => `Abono de ${customer} · venta #${folio}`,
    void: (folio: string, reason: string | null) =>
      reason ? `Venta #${folio} anulada (${reason})` : `Venta #${folio} anulada`,
    restock: (qty: string, product: string) => `Ingreso de ${qty} × ${product}`,
    adjustment: (product: string, reason: string | null) =>
      reason ? `${product}: ${reason}` : `Ajuste de conteo: ${product}`,
    product_created: (product: string, code: string) => `Nuevo producto: ${product} (${code})`,
    customer_created: (customer: string) => `Cliente nuevo: ${customer}`,
    reminder: (customer: string, folio: string) =>
      `Recordatorio enviado a ${customer} · venta #${folio}`,
  },

  // Estado (F7-T03)
  statusEmptyTitle: '✅ Todo en orden',
  statusEmptyBody: 'No hay cuentas vencidas ni productos con stock bajo.',
  statusLoading: 'Revisando…',
  severity: { urgent: 'Urgente', attention: 'Atención' },
  alert: {
    overdue_installment: (customer: string, amount: string) =>
      `${customer} tiene ${amount} vencido`,
    overdue_installmentDetail: (folio: string, date: string) =>
      `Venta #${folio} · cuota del ${date}`,
    upcoming_installment: (customer: string) => `Cuota de ${customer} vence pronto`,
    upcoming_installmentDetail: (date: string, amount: string) => `${date} · ${amount}`,
    out_of_stock: (product: string) => `${product} está agotado`,
    low_stock: (product: string, left: string) => `${product}: quedan ${left}`,
    productDetail: 'Toca para ver el producto',
  },

  // Análisis (F7-T04)
  periodLabel: 'Período',
  period: (days: number) => `${String(days)} días`,
  analyticsLoading: 'Calculando…',
  analyticsEmptyTitle: 'No hay ventas en este periodo',
  analyticsEmptyBody: 'Cuando registres ventas, aquí verás el resumen.',
  sold: 'Vendido',
  salesCount: (count: number) => `${String(count)} ${count === 1 ? 'venta' : 'ventas'}`,
  collected: 'Cobrado',
  collectedHint: 'dinero recibido',
  average: 'Venta promedio',
  averageHint: 'por venta',
  profit: 'Ganancia bruta',
  marginHint: (pct: number) => `${String(pct)}% margen`,
  salesLabel: 'Ventas',
  salesHint: 'en el periodo',
  byDay: 'Ventas por día',
  byDayLabel: 'Ventas por día, contado y a pagos',
  barTitle: (day: string, total: string) => `${day}: ${total}`,
  cash: 'Contado',
  installments: 'A pagos',
  legend: (label: string, amount: string) => `${label} ${amount}`,
  mixTitle: 'Contado vs. a pagos',
  mixLegend: (label: string, pct: number) => `${label} · ${String(pct)}%`,
  topTitle: 'Productos más vendidos',
  topQty: (qty: number) => `×${String(qty)}`,
  byCategoryTitle: 'Por categoría',
} as const;
