import { describe, expect, it } from 'vitest';

import { backupFileName, buildBackupSheets, type BackupLabels, type ExportData } from './backup';

const labels: BackupLabels = {
  sheets: {
    sales: 'Ventas',
    lines: 'Líneas',
    installments: 'Cuotas',
    payments: 'Abonos',
    customers: 'Clientes',
    inventory: 'Inventario',
    movements: 'Movimientos',
  },
  columns: {
    sales: Array.from({ length: 10 }, (_, i) => `s${String(i)}`),
    lines: Array.from({ length: 6 }, (_, i) => `l${String(i)}`),
    installments: Array.from({ length: 4 }, (_, i) => `i${String(i)}`),
    payments: Array.from({ length: 4 }, (_, i) => `p${String(i)}`),
    customers: Array.from({ length: 7 }, (_, i) => `c${String(i)}`),
    inventory: Array.from({ length: 7 }, (_, i) => `n${String(i)}`),
    movements: Array.from({ length: 7 }, (_, i) => `m${String(i)}`),
  },
  values: {
    cash: 'Contado',
    installments: 'A pagos',
    legacy: 'Saldo anterior',
    yes: 'Sí',
    no: 'No',
    paymentKinds: { payment: 'Abono' },
    movementTypes: { sale: 'Venta' },
  },
};

const data: ExportData = {
  generatedAt: '2026-11-19T21:00:00Z',
  businessName: 'Mi Negocio',
  customers: [
    { id: 'c1', name: 'Tamara Odio', phone_e164: '+50680000001', whatsapp_opt_in: false },
  ],
  products: [
    {
      id: 'p1',
      code: 'BIS-001',
      name: 'Aretes',
      price: 6500,
      unit_cost: 2200,
      stock: 16,
      min_stock: 6,
      active: true,
    },
  ],
  sales: [
    {
      id: 's1',
      folio: 1001,
      client_created_at: '2026-11-19T21:30:00Z',
      customer_id: 'c1',
      type: 'cash',
      source: 'app',
      total: 13000,
      down_payment: 0,
      months: null,
    },
  ],
  saleItems: [
    {
      sale_id: 's1',
      product_id: 'p1',
      product_name: 'Aretes',
      qty: 2,
      unit_price: 6500,
      unit_cost: 2200,
    },
  ],
  installments: [],
  payments: [
    { sale_id: 's1', kind: 'payment', amount: 13000, client_created_at: '2026-11-19T21:30:00Z' },
  ],
  movements: [
    {
      product_id: 'p1',
      type: 'sale',
      qty_delta: -2,
      stock_after: 16,
      created_at: '2026-11-19T21:30:00Z',
    },
  ],
};

describe('buildBackupSheets (F7-T09)', () => {
  const sheets = buildBackupSheets(data, labels);

  it('has the seven sheets, each row as wide as its headers', () => {
    expect(sheets.map((s) => s.name)).toEqual([
      'Ventas',
      'Líneas',
      'Cuotas',
      'Abonos',
      'Clientes',
      'Inventario',
      'Movimientos',
    ]);
    for (const sheet of sheets) {
      for (const row of sheet.rows) expect(row).toHaveLength(sheet.columns.length);
    }
  });

  it('writes names, codes and folios instead of ids, and Costa Rica time', () => {
    const [sales, lines, , payments, , , movements] = sheets;
    // 21:30 UTC is 15:30 in Costa Rica.
    expect(sales?.rows[0]?.slice(0, 5)).toEqual([
      1001,
      '2026-11-19 15:30',
      'Tamara Odio',
      'Contado',
      13000,
    ]);
    expect(lines?.rows[0]?.slice(0, 2)).toEqual([1001, 'BIS-001']);
    expect(payments?.rows[0]?.[2]).toBe('Abono');
    expect(movements?.rows[0]?.slice(1, 3)).toEqual(['BIS-001', 'Venta']);
  });

  it('keeps money as numbers', () => {
    expect(typeof sheets[0]?.rows[0]?.[4]).toBe('number');
  });

  it('names the file with the date', () => {
    expect(backupFileName('respaldo', '2026-11-19')).toBe('respaldo-2026-11-19.xlsx');
  });
});
