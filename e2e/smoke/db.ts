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
