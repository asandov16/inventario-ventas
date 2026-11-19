/**
 * Keep-alive for Supabase Free projects (F8-T07, ADR-042): a project with no
 * activity for 7 days is paused. Every few hours each project gets one
 * authenticated request with its public anon key:
 *   - `ping()` RPC when the project has the migrations (staging today);
 *   - the GraphQL endpoint otherwise (production until Stage 4 applies migrations):
 *     it is a function inside Postgres, so it reaches the database even with no tables.
 *     (The REST root rejects public keys, so it cannot be used.)
 * A 401/403 or a network failure means the request did not count: it fails loudly.
 */

export interface Target {
  name: string;
  url: string;
  anonKey: string;
}

export interface PingResult {
  name: string;
  status: number;
  via: 'rpc' | 'graphql';
  ok: boolean;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

function headers(anonKey: string): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
}

const isAccepted = (status: number) => status >= 200 && status < 300;

export async function pingTarget(target: Target, fetchFn: Fetch): Promise<PingResult> {
  const base = target.url.replace(/\/+$/, '');
  const rpc = await fetchFn(`${base}/rest/v1/rpc/ping`, {
    method: 'POST',
    headers: headers(target.anonKey),
    body: '{}',
  });
  if (isAccepted(rpc.status))
    return { name: target.name, status: rpc.status, via: 'rpc', ok: true };

  // No ping() yet (404): the GraphQL function still runs a query in the database.
  const graphql = await fetchFn(`${base}/graphql/v1`, {
    method: 'POST',
    headers: headers(target.anonKey),
    body: JSON.stringify({ query: '{ __typename }' }),
  });
  return {
    name: target.name,
    status: graphql.status,
    via: 'graphql',
    ok: isAccepted(graphql.status),
  };
}

/** Pings every target; never stops at the first failure. */
export async function pingAll(targets: readonly Target[], fetchFn: Fetch): Promise<PingResult[]> {
  return Promise.all(
    targets.map(async (target) => {
      try {
        return await pingTarget(target, fetchFn);
      } catch {
        return { name: target.name, status: 0, via: 'rpc' as const, ok: false };
      }
    }),
  );
}

/** True for a bare project URL (https://<ref>.supabase.co), the only form the paths can be built on. */
export function isBareProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, '') === '' && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

/**
 * Targets from the Worker's variables; a project without both values is skipped.
 * A URL with a path (for example …/rest/v1/) would turn every ping into a 404, so it
 * stops the run with a message that names the variable to fix.
 */
export function targetsFromEnv(env: Record<string, string | undefined>): Target[] {
  const targets: Target[] = [];
  for (const name of ['STAGING', 'PROD']) {
    const url = env[`${name}_SUPABASE_URL`];
    const anonKey = env[`${name}_SUPABASE_ANON_KEY`];
    if (!url || !anonKey) continue;
    if (!isBareProjectUrl(url)) {
      throw new Error(
        `${name}_SUPABASE_URL must be the bare project URL (https://<ref>.supabase.co)`,
      );
    }
    targets.push({ name: name.toLowerCase(), url, anonKey });
  }
  return targets;
}
