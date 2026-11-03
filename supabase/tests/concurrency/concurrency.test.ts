/**
 * Concurrency scenarios from roadmap F2-T12 (and Req. Técnicos §5): what happens when two
 * phones act at the same moment. Each test runs real parallel transactions.
 */
import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { asOwner, asUser, rpc, USERS } from './db';

interface SaleResult {
  status: string;
  sale: { id: string; folio: number; balance: number };
}

let categoryId = '';
let customerId = '';
let paymentMethodId = '';

beforeAll(async () => {
  const [row] = await asOwner<{ category_id: string; customer_id: string; method_id: string }>(
    `select
        (select id from public.categories where prefix = 'BIS') as category_id,
        (select id from public.customers where phone_e164 = '+50680000013') as customer_id,
        (select id from public.payment_methods where name = 'Efectivo') as method_id`,
  );
  if (!row) throw new Error('Seed data missing: run pnpm db:reset');
  categoryId = row.category_id;
  customerId = row.customer_id;
  paymentMethodId = row.method_id;
});

/** Creates a fresh product with the given stock, as the admin. */
async function createProduct(stock: number, price = 1000): Promise<string> {
  const outcome = await asUser(USERS.admin, (client) =>
    rpc<{ product: { id: string } }>(
      client,
      'public.create_product($1, $2, $3, $4, 0, $5, 100, true)',
      [randomUUID(), `Prueba concurrencia ${randomUUID()}`, categoryId, price, stock],
    ),
  );
  if (!outcome.ok) throw new Error(outcome.code);
  return outcome.value.product.id;
}

function sell(
  productId: string,
  price: number,
  key = randomUUID(),
  type = 'cash',
  months: number | null = null,
) {
  return asUser(USERS.seller, (client) =>
    rpc<SaleResult>(client, 'public.register_sale($1, $2, $3, $4, $5, $6, $7, 0, true)', [
      key,
      customerId,
      type,
      JSON.stringify([{ product_id: productId, qty: 1 }]),
      type === 'cash' ? paymentMethodId : null,
      price,
      months,
    ]),
  );
}

describe('concurrency', () => {
  it('two sales of the last unit: exactly one wins and stock ends at 0 (RN-02)', async () => {
    const productId = await createProduct(1);

    const results = await Promise.all([sell(productId, 1000), sell(productId, 1000)]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual(['insufficient_stock']);
    const [product] = await asOwner<{ stock: number }>(
      'select stock from public.products where id = $1',
      [productId],
    );
    expect(product?.stock).toBe(0);
  });

  it('the same idempotency key twice at once saves one sale; the other is a replay (RN-18)', async () => {
    const productId = await createProduct(5);
    const key = randomUUID();

    const results = await Promise.all([sell(productId, 1000, key), sell(productId, 1000, key)]);

    const statuses = results.map((r) => (r.ok ? r.value.status : r.code)).sort();
    expect(statuses).toEqual(['ok', 'replay']);
    const rows = await asOwner('select id from public.sales where idempotency_key = $1', [key]);
    expect(rows).toHaveLength(1);
  });

  it('20 sales in parallel get 20 consecutive folios, no gaps or repeats (RN-15)', async () => {
    const productId = await createProduct(20);

    const results = await Promise.all(Array.from({ length: 20 }, () => sell(productId, 1000)));

    const folios = results.map((r) => (r.ok ? r.value.sale.folio : -1)).sort((a, b) => a - b);
    expect(folios).not.toContain(-1);
    const first = folios[0] ?? 0;
    expect(folios).toEqual(Array.from({ length: 20 }, (_, index) => first + index));
  });

  it('two admins void the same sale at once: one voids it, the other is told it is already voided', async () => {
    const productId = await createProduct(2);
    const sale = await sell(productId, 1000);
    if (!sale.ok) throw new Error(sale.code);

    const voidAs = (userId: string) =>
      asUser(userId, (client) =>
        rpc(client, 'public.void_sale($1, $2)', [sale.value.sale.id, 'Prueba']),
      );
    const results = await Promise.all([voidAs(USERS.admin), voidAs(USERS.admin2)]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual(['already_voided']);
    const [product] = await asOwner<{ stock: number }>(
      'select stock from public.products where id = $1',
      [productId],
    );
    expect(product?.stock).toBe(2);
  });

  it('two payments that together exceed the balance: one is saved, the other is refused (RN-06)', async () => {
    const productId = await createProduct(1, 20000);
    const sale = await sell(productId, 20000, randomUUID(), 'installments', 2);
    if (!sale.ok) throw new Error(sale.code);

    const pay = () =>
      asUser(USERS.seller, (client) =>
        rpc(client, 'public.register_payment($1, $2, $3, $4)', [
          randomUUID(),
          sale.value.sale.id,
          12000,
          paymentMethodId,
        ]),
      );
    const results = await Promise.all([pay(), pay()]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual(['payment_exceeds_balance']);
  });

  it('two phones create the same customer at once: one creates it, the other gets "exists" (RN-01)', async () => {
    const phone = `8${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
    const create = () =>
      asUser(USERS.seller, (client) =>
        rpc<{ status: string }>(client, 'public.create_customer($1, $2)', [
          'Cliente Paralelo',
          phone,
        ]),
      );

    const results = await Promise.all([create(), create()]);

    const statuses = results.map((r) => (r.ok ? r.value.status : r.code)).sort();
    expect(statuses).toEqual(['exists', 'ok']);
  });
});
