import pg from 'pg';

/** Local Supabase database (public by design, local only). CI uses the same default. */
const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Seed users (supabase/seed.sql). */
export const USERS = {
  admin: '00000000-0000-4000-8000-000000000001',
  admin2: '00000000-0000-4000-8000-000000000002',
  seller: '00000000-0000-4000-8000-000000000003',
} as const;

export type Outcome<T> = { ok: true; value: T } | { ok: false; code: string };

/**
 * Runs `fn` in its own connection and transaction, as the given user, the way PostgREST does
 * for a request carrying that user's JWT. Business errors come back as `{ ok: false, code }`.
 */
export async function asUser<T>(
  userId: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<Outcome<T>> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await client.query('set local role authenticated');
    const value = await fn(client);
    await client.query('commit');
    return { ok: true, value };
  } catch (error) {
    await client.query('rollback');
    return { ok: false, code: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.end();
  }
}

/** Calls an RPC that returns jsonb and gives back the parsed object. */
export async function rpc<T = Record<string, unknown>>(
  client: pg.Client,
  sql: string,
  params: unknown[],
): Promise<T> {
  const result = await client.query<{ result: T }>(`select ${sql} as result`, params);
  const row = result.rows[0];
  if (!row) throw new Error('RPC returned no row');
  return row.result;
}

/** Runs a read as the database owner (bypasses RLS), for setup and assertions. */
export async function asOwner<T extends pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}
