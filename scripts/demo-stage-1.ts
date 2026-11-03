/* eslint-disable no-console -- this script's purpose is to print a narrated walkthrough */
/**
 * Stage 1 demo (`pnpm db:demo`): a narrated walkthrough, in Spanish, of the business rules
 * running in the local database through the same RPCs the app will call. It writes data to
 * the LOCAL database only; run `pnpm db:reset` to start over.
 */
import { randomUUID } from 'node:crypto';

import { asOwner, asUser, rpc, USERS } from '../supabase/tests/concurrency/db.ts';

const money = (value: number): string =>
  new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(value);

const step = (title: string): void => {
  console.log(`\n▸ ${title}`);
};
const say = (text: string): void => {
  console.log(`  ${text}`);
};

interface Installment {
  number: number;
  due_date: string;
  amount: number;
}
interface SaleResult {
  status: string;
  sale: { id: string; folio: number; total: number; balance: number; installments: Installment[] };
}

async function main(): Promise<void> {
  const [ids] = await asOwner<{
    customer_id: string;
    customer: string;
    product_id: string;
    method_id: string;
  }>(
    `select
        (select id from public.customers where phone_e164 = '+50680000006') as customer_id,
        (select name from public.customers where phone_e164 = '+50680000006') as customer,
        (select id from public.products where code = 'PER-004') as product_id,
        (select id from public.payment_methods where name = 'SINPE Móvil') as method_id`,
  );
  if (!ids) throw new Error('Faltan datos de ejemplo: corre pnpm db:reset');

  console.log('Demostración de la Etapa 1 — reglas de negocio en la base de datos local');

  step(`El Vendedor registra una venta a pagos para ${ids.customer}`);
  const sale = await asUser(USERS.seller, (client) =>
    rpc<SaleResult>(client, 'public.register_sale($1, $2, $3, $4, $5, $6, $7, $8, true)', [
      randomUUID(),
      ids.customer_id,
      'installments',
      JSON.stringify([{ product_id: ids.product_id, qty: 1 }]),
      ids.method_id,
      31000,
      3,
      7000,
    ]),
  );
  if (!sale.ok) throw new Error(sale.code);
  const { folio, id: saleId, total, installments } = sale.value.sale;
  say(`Venta #${String(folio)} por ${money(total)}, prima de ${money(7000)}, a 3 meses.`);
  for (const cuota of installments) {
    say(`  Cuota ${String(cuota.number)}: ${money(cuota.amount)} el ${cuota.due_date}`);
  }

  step('El cliente paga un abono');
  const payment = await asUser(USERS.seller, (client) =>
    rpc<{ balance: number }>(client, 'public.register_payment($1, $2, $3, $4)', [
      randomUUID(),
      saleId,
      8000,
      ids.method_id,
    ]),
  );
  if (!payment.ok) throw new Error(payment.code);
  say(`Abono de ${money(8000)} guardado · Saldo: ${money(payment.value.balance)}`);

  step('Un abono mayor que el saldo no se permite (RN-06)');
  const tooMuch = await asUser(USERS.seller, (client) =>
    rpc(client, 'public.register_payment($1, $2, $3, $4)', [
      randomUUID(),
      saleId,
      999999,
      ids.method_id,
    ]),
  );
  say(tooMuch.ok ? 'ERROR: se aceptó' : `Rechazado con el código "${tooMuch.code}"`);

  step('El Vendedor no puede ver costos ni anular ventas');
  const costs = await asUser(USERS.seller, async (client) => {
    const result = await client.query<{ n: number }>(
      'select count(*)::int as n from public.product_costs',
    );
    return result.rows[0]?.n ?? 0;
  });
  say(`Costos visibles para el Vendedor: ${costs.ok ? String(costs.value) : costs.code}`);
  const sellerVoid = await asUser(USERS.seller, (client) =>
    rpc(client, 'public.void_sale($1, $2)', [saleId, 'Devolución']),
  );
  say(`Intento de anular como Vendedor: ${sellerVoid.ok ? 'ERROR: se permitió' : sellerVoid.code}`);

  step('El Administrador anula la venta: el producto regresa al inventario (RN-09, RN-11)');
  const voided = await asUser(USERS.admin, (client) =>
    rpc<{ returned_units: number; received_amount: number }>(client, 'public.void_sale($1, $2)', [
      saleId,
      'Devolución',
    ]),
  );
  if (!voided.ok) throw new Error(voided.code);
  say(
    `Venta #${String(folio)} anulada · ${String(voided.value.returned_units)} producto regresó al inventario · ` +
      `ya se habían recibido ${money(voided.value.received_amount)} (se resuelve con el cliente)`,
  );

  step('Inicio y Por cobrar se calculan solos');
  const summary = await asUser(USERS.admin, (client) =>
    rpc<{ sales_today: number; receivable_total: number; low_stock_count: number }>(
      client,
      'public.get_dashboard_summary()',
      [],
    ),
  );
  if (!summary.ok) throw new Error(summary.code);
  say(`Ventas de hoy: ${money(summary.value.sales_today)}`);
  say(`Total por cobrar: ${money(summary.value.receivable_total)}`);
  say(`Productos con stock bajo o agotados: ${String(summary.value.low_stock_count)}`);

  console.log('\nListo. Para volver a los datos de ejemplo: pnpm db:reset');
}

await main();
