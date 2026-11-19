// Spanish copy for the history feature (CU-04, F5-T01/T04, prototype v2).
export const HISTORY_MESSAGES = {
  title: 'Historial de ventas',
  count: (count: number, hasMore: boolean) =>
    `${String(count)}${hasMore ? '+' : ''} ${count === 1 ? 'registro' : 'registros'}`,
  searchPlaceholder: 'Buscar por cliente, teléfono o # de venta',
  searchLabel: 'Buscar en el historial',
  kindsLabel: 'Tipo de venta',
  kinds: { all: 'Todas', cash: 'De contado', installments: 'A pagos', voided: 'Anuladas' },
  moreFilters: 'Más filtros',
  lessFilters: 'Menos filtros',
  fromDate: 'Desde',
  toDate: 'Hasta',
  seller: 'Vendedor',
  anySeller: 'Todos',
  clearFilters: 'Limpiar filtros',
  dayHeader: (label: string, total: string) => `${label} · ${total}`,
  rowMeta: (folio: number, items: number, time: string) =>
    `#${String(folio)} · ${String(items)} ${items === 1 ? 'artículo' : 'artículos'} · ${time}`,
  rowMetaLegacy: (folio: number, description: string | null) =>
    description ? `#${String(folio)} · ${description}` : `#${String(folio)}`,
  rowLabel: (customer: string, folio: number) => `Venta #${String(folio)} a ${customer}`,
  loading: 'Cargando ventas…',
  loadingMore: 'Cargando más ventas…',
  loadMore: 'Ver más ventas',
  end: 'No hay más ventas.',
  emptyTitle: 'Todavía no hay ventas',
  emptyBody: 'Cuando registres una venta aparecerá aquí.',
  noResultsTitle: 'No hay ventas que coincidan',
  noResultsBody: 'Prueba con otro nombre o filtro.',
} as const;
