// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { API_MESSAGES } from './messages.es';
import type { RpcResponse } from './rpc';
import { useRpcMutation, type RpcCallContext } from './useRpcMutation';

vi.mock('./supabaseClient', () => ({ supabase: {} }));

interface Saved extends RpcResponse {
  folio?: number;
}

function setup(rpc: (input: string, context: RpcCallContext) => Promise<Saved>) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useRpcMutation({ rpc, invalidates: [['sales']] }), { wrapper });
  return { hook, invalidate };
}

describe('useRpcMutation', () => {
  it('reuses the idempotency key on retry and drops it after the save', async () => {
    const keys: string[] = [];
    let attempt = 0;
    const rpc = vi.fn((_input: string, { idempotencyKey }: RpcCallContext) => {
      keys.push(idempotencyKey);
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({ status: 'ok' as const });
    });
    const { hook, invalidate } = setup(rpc);

    const first = await act(() => hook.result.current.submit('sale'));
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.error?.kind).toBe('network');
      expect(first.error?.message).toBe(API_MESSAGES.saveFailed);
    }

    const retry = await act(() => hook.result.current.submit('sale'));
    expect(retry.ok).toBe(true);
    expect(keys[1]).toBe(keys[0]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales'] });

    await act(() => hook.result.current.submit('another sale'));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('keeps the key when the database asks to confirm a possible duplicate', async () => {
    const calls: RpcCallContext[] = [];
    const rpc = vi.fn((_input: string, context: RpcCallContext) => {
      calls.push(context);
      return Promise.resolve({
        status: context.confirmDuplicate ? ('ok' as const) : ('possible_duplicate' as const),
      });
    });
    const { hook, invalidate } = setup(rpc);

    const first = await act(() => hook.result.current.submit('sale'));
    expect(first).toEqual({ ok: true, response: { status: 'possible_duplicate' } });
    expect(invalidate).not.toHaveBeenCalled();

    await act(() => hook.result.current.submit('sale', { confirmDuplicate: true }));
    expect(calls[1]).toEqual({ idempotencyKey: calls[0]?.idempotencyKey, confirmDuplicate: true });
  });

  it('ignores a second submit while the first is in flight (double tap)', async () => {
    let resolve: (value: Saved) => void = () => undefined;
    const rpc = vi.fn(
      () =>
        new Promise<Saved>((r) => {
          resolve = r;
        }),
    );
    const { hook } = setup(rpc);

    let first: Promise<unknown> = Promise.resolve();
    let second: unknown;
    await act(async () => {
      first = hook.result.current.submit('sale');
      second = await hook.result.current.submit('sale');
    });
    expect(second).toEqual({ ok: false, error: null, ignored: true });
    await act(async () => {
      resolve({ status: 'ok' });
      await first;
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('translates business errors', async () => {
    const rpc = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error('customer_required'), { code: 'P0001', details: '{}' }),
      ),
    );
    const { hook } = setup(rpc);
    const result = await act(() => hook.result.current.submit('sale'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        kind: 'business',
        code: 'customer_required',
        message: 'Elige o registra al cliente para continuar.',
      });
    }
  });

  it('startNew discards the key of an unfinished action', async () => {
    const keys: string[] = [];
    const rpc = vi.fn((_input: string, { idempotencyKey }: RpcCallContext) => {
      keys.push(idempotencyKey);
      return Promise.reject(new TypeError('Failed to fetch'));
    });
    const { hook } = setup(rpc);
    await act(() => hook.result.current.submit('sale'));
    act(() => {
      hook.result.current.startNew();
    });
    await act(() => hook.result.current.submit('sale'));
    expect(keys[1]).not.toBe(keys[0]);
  });
});
