import { toBusinessDateTime } from '@/shared/domain/dates';

/**
 * Respaldo en Excel (F7-T09, RNF-07): the rows of each sheet, built from
 * export_data without React or the network. Names replace ids so the file can
 * be read by a person; money stays in whole colones (numbers, not text).
 */

type Row = Record<string, unknown>;

export interface ExportData {
  generatedAt: string;
  businessName: string;
  customers: Row[];
  products: Row[];
  sales: Row[];
  saleItems: Row[];
  installments: Row[];
  payments: Row[];
  movements: Row[];
}

export type Cell = string | number | boolean | null;

export interface BackupSheet {
  name: string;
  columns: string[];
  rows: Cell[][];
}

/** Sheet names and headers, in Spanish, given by the caller (messages.es.ts). */
export interface BackupLabels {
  sheets: {
    sales: string;
    lines: string;
    installments: string;
    payments: string;
    customers: string;
    inventory: string;
    movements: string;
  };
  columns: {
    sales: string[];
    lines: string[];
    installments: string[];
    payments: string[];
    customers: string[];
    inventory: string[];
    movements: string[];
  };
  values: {
    cash: string;
    installments: string;
    legacy: string;
    yes: string;
    no: string;
    paymentKinds: Record<string, string>;
    movementTypes: Record<string, string>;
  };
}

function text(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function num(row: Row, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' ? value : null;
}

function when(row: Row, key: string): string | null {
  const value = text(row, key);
  return value ? toBusinessDateTime(new Date(value)) : null;
}

function indexBy(rows: readonly Row[], key: string, value: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = text(row, key);
    const label = text(row, value);
    if (id && label) map.set(id, label);
  }
  return map;
}

export function buildBackupSheets(data: ExportData, labels: BackupLabels): BackupSheet[] {
  const customerNames = indexBy(data.customers, 'id', 'name');
  const productCodes = indexBy(data.products, 'id', 'code');
  const folios = new Map<string, number>();
  for (const sale of data.sales) {
    const id = text(sale, 'id');
    const folio = num(sale, 'folio');
    if (id && folio !== null) folios.set(id, folio);
  }
  const folioOf = (row: Row) => folios.get(text(row, 'sale_id') ?? '') ?? null;
  const v = labels.values;

  return [
    {
      name: labels.sheets.sales,
      columns: labels.columns.sales,
      rows: data.sales.map((sale) => [
        num(sale, 'folio'),
        when(sale, 'client_created_at'),
        customerNames.get(text(sale, 'customer_id') ?? '') ?? null,
        text(sale, 'source') === 'legacy_import'
          ? v.legacy
          : text(sale, 'type') === 'cash'
            ? v.cash
            : v.installments,
        num(sale, 'total'),
        num(sale, 'down_payment'),
        num(sale, 'months'),
        text(sale, 'description'),
        when(sale, 'voided_at'),
        text(sale, 'void_reason'),
      ]),
    },
    {
      name: labels.sheets.lines,
      columns: labels.columns.lines,
      rows: data.saleItems.map((line) => [
        folioOf(line),
        productCodes.get(text(line, 'product_id') ?? '') ?? null,
        text(line, 'product_name'),
        num(line, 'qty'),
        num(line, 'unit_price'),
        num(line, 'unit_cost'),
      ]),
    },
    {
      name: labels.sheets.installments,
      columns: labels.columns.installments,
      rows: data.installments.map((installment) => [
        folioOf(installment),
        num(installment, 'number'),
        text(installment, 'due_date'),
        num(installment, 'amount'),
      ]),
    },
    {
      name: labels.sheets.payments,
      columns: labels.columns.payments,
      rows: data.payments.map((payment) => [
        folioOf(payment),
        when(payment, 'client_created_at'),
        v.paymentKinds[text(payment, 'kind') ?? ''] ?? text(payment, 'kind'),
        num(payment, 'amount'),
      ]),
    },
    {
      name: labels.sheets.customers,
      columns: labels.columns.customers,
      rows: data.customers.map((customer) => [
        text(customer, 'name'),
        text(customer, 'phone_e164'),
        text(customer, 'email'),
        text(customer, 'zone'),
        text(customer, 'notes'),
        customer.whatsapp_opt_in === true ? v.yes : v.no,
        when(customer, 'created_at'),
      ]),
    },
    {
      name: labels.sheets.inventory,
      columns: labels.columns.inventory,
      rows: data.products.map((product) => [
        text(product, 'code'),
        text(product, 'name'),
        num(product, 'price'),
        num(product, 'unit_cost'),
        num(product, 'stock'),
        num(product, 'min_stock'),
        product.active === true ? v.yes : v.no,
      ]),
    },
    {
      name: labels.sheets.movements,
      columns: labels.columns.movements,
      rows: data.movements.map((movement) => [
        when(movement, 'created_at'),
        productCodes.get(text(movement, 'product_id') ?? '') ?? null,
        v.movementTypes[text(movement, 'type') ?? ''] ?? text(movement, 'type'),
        num(movement, 'qty_delta'),
        num(movement, 'stock_after'),
        text(movement, 'reason'),
        num(movement, 'unit_cost'),
      ]),
    },
  ];
}

/** "respaldo-2026-11-19.xlsx" */
export function backupFileName(prefix: string, isoDate: string): string {
  return `${prefix}-${isoDate}.xlsx`;
}
