import { describe, expect, it, vi } from 'vitest';

import { pingAll, targetsFromEnv, type Target } from './keepalive';

const target: Target = { name: 'staging', url: 'https://example.supabase.co/', anonKey: 'anon' };

const response = (status: number) => new Response(null, { status });

describe('pingAll', () => {
  it('uses ping() when the project has it', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(response(200)));
    await expect(pingAll([target], fetchFn)).resolves.toEqual([
      { name: 'staging', status: 200, via: 'rpc', ok: true },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/ping',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to the GraphQL function when ping() does not exist yet', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(response(404))
      .mockResolvedValueOnce(response(200));
    const [result] = await pingAll([target], fetchFn);
    expect(result).toEqual({ name: 'staging', status: 200, via: 'graphql', ok: true });
  });

  it('reports a rejected key as a failure (it would not count as activity)', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(response(401)));
    const [result] = await pingAll([target], fetchFn);
    expect(result?.ok).toBe(false);
  });

  it('keeps going when one project is unreachable', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValue(response(200));
    const results = await pingAll([target, { ...target, name: 'prod' }], fetchFn);
    expect(results.map((r) => r.ok)).toEqual([false, true]);
  });
});

describe('targetsFromEnv', () => {
  it('reads the projects that have both URL and anon key', () => {
    expect(
      targetsFromEnv({
        STAGING_SUPABASE_URL: 'https://s.supabase.co',
        STAGING_SUPABASE_ANON_KEY: 'a',
        PROD_SUPABASE_URL: 'https://p.supabase.co',
      }),
    ).toEqual([{ name: 'staging', url: 'https://s.supabase.co', anonKey: 'a' }]);
  });
});
