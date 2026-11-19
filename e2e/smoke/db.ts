import pg from 'pg';

/**
 * Direct access to the LOCAL test database (Supabase CLI defaults, public by
 * design; ADR-039). Used only to arrange or check state that the UI cannot,
 * such as stock changing on another device or counting saved sales.
 */
const LOCAL_DB_URL = 'postgres://postgres:postgres@127.0.0.1:54322/postgres';

export async function withDb<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: LOCAL_DB_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

export async function countSalesOf(customerName: string): Promise<number> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ n: number }>(
      `select count(*)::int as n
       from public.sales as s
       inner join public.customers as c on c.id = s.customer_id
       where c.name = $1 and s.voided_at is null`,
      [customerName],
    );
    return rows[0]?.n ?? 0;
  });
}

export async function stockOf(code: string): Promise<number> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ stock: number }>(
      'select stock from public.products where code = $1',
      [code],
    );
    return rows[0]?.stock ?? -1;
  });
}

/** Simulates another device selling the remaining units meanwhile. */
export async function setStock(code: string, stock: number): Promise<void> {
  await withDb(async (client) => {
    await client.query('update public.products set stock = $2 where code = $1', [code, stock]);
  });
}

/**
 * Rows of product_costs a user receives through the API: runs the query as the
 * `authenticated` role with that user's JWT claims, exactly as PostgREST does.
 */
export async function productCostRowsVisibleTo(email: string): Promise<number> {
  return withDb(async (client) => {
    await client.query('begin');
    try {
      await client.query(
        `select set_config('request.jwt.claims',
           json_build_object('sub', u.id, 'role', 'authenticated')::text, true)
         from auth.users as u where u.email = $1`,
        [email],
      );
      await client.query('set local role authenticated');
      const { rows } = await client.query<{ n: number }>(
        'select count(*)::int as n from public.product_costs',
      );
      return rows[0]?.n ?? -1;
    } finally {
      await client.query('rollback');
    }
  });
}

/** Simulates someone else saving the product meanwhile (CU-11 concurrent_update). */
export async function bumpProductVersion(code: string): Promise<void> {
  await withDb(async (client) => {
    await client.query('update public.products set version = version + 1 where code = $1', [code]);
  });
}

/**
 * Another phone registers a cash sale (1 unit) through register_sale as that user,
 * exactly as the API would. Returns the folio.
 */
export async function registerCashSaleAs(
  email: string,
  productCode: string,
  customerPhoneE164: string,
): Promise<number> {
  return withDb(async (client) => {
    await client.query('begin');
    try {
      await client.query(
        `select set_config('request.jwt.claims',
           json_build_object('sub', u.id, 'role', 'authenticated')::text, true)
         from auth.users as u where u.email = $1`,
        [email],
      );
      await client.query('set local role authenticated');
      const { rows } = await client.query<{ folio: number }>(
        `select (public.register_sale(
           p_idempotency_key => gen_random_uuid(),
           p_customer_id => (select id from public.customers where phone_e164 = $2),
           p_type => 'cash',
           p_items => jsonb_build_array(jsonb_build_object(
             'product_id', (select id from public.products where code = $1), 'qty', 1)),
           p_payment_method_id => (select id from public.v_payment_methods where name = 'Efectivo'),
           p_expected_total => (select price from public.products where code = $1)
         ) -> 'sale' ->> 'folio')::int as folio`,
        [productCode, customerPhoneE164],
      );
      await client.query('commit');
      return rows[0]?.folio ?? -1;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}
