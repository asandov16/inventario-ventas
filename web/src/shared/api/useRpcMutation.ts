import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { toAppError, type AppError } from './errors';
import type { RpcResponse } from './rpc';

/**
 * The single write gateway (CLAUDE.md, ADR-005). Every write goes through it so
 * the offline queue of F10 can be added underneath without touching screens.
 *
 * - Idempotency (RN-18): a key is created on the first attempt, reused on every
 *   retry of the same action (including "save anyway" after a possible
 *   duplicate) and discarded only after the database confirms the save.
 * - A second submit while one is in flight is ignored (double tap).
 * - Errors come back as AppError with a Spanish message; feedback (toasts,
 *   dialogs) is the caller's job, in the feature's hook.
 */
export interface RpcCallContext {
  idempotencyKey: string;
  confirmDuplicate: boolean;
}

export interface RpcMutationOptions<TInput, TResponse extends RpcResponse> {
  rpc: (input: TInput, context: RpcCallContext) => Promise<TResponse>;
  /** Query key prefixes to refresh after a confirmed save. */
  invalidates?: readonly QueryKey[];
}

export type SubmitResult<TResponse> =
  | { ok: true; response: TResponse }
  | { ok: false; error: AppError }
  | { ok: false; error: null; ignored: true };

interface Variables<TInput> {
  input: TInput;
  confirmDuplicate: boolean;
}

const SAVED_STATUSES = new Set(['ok', 'replay']);

export function useRpcMutation<TInput, TResponse extends RpcResponse>({
  rpc,
  invalidates = [],
}: RpcMutationOptions<TInput, TResponse>) {
  const queryClient = useQueryClient();
  const keyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const mutation = useMutation<TResponse, AppError, Variables<TInput>>({
    mutationFn: async ({ input, confirmDuplicate }) => {
      keyRef.current ??= crypto.randomUUID();
      try {
        return await rpc(input, { idempotencyKey: keyRef.current, confirmDuplicate });
      } catch (error) {
        throw toAppError(error);
      }
    },
    retry: false,
    onSuccess: async (response) => {
      if (!SAVED_STATUSES.has(response.status)) return;
      keyRef.current = null;
      await Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
  const { mutateAsync, reset } = mutation;

  const submit = useCallback(
    async (
      input: TInput,
      options: { confirmDuplicate?: boolean } = {},
    ): Promise<SubmitResult<TResponse>> => {
      if (inFlightRef.current) return { ok: false, error: null, ignored: true };
      inFlightRef.current = true;
      try {
        const response = await mutateAsync({
          input,
          confirmDuplicate: options.confirmDuplicate ?? false,
        });
        return { ok: true, response };
      } catch (error) {
        return { ok: false, error: toAppError(error) };
      } finally {
        inFlightRef.current = false;
      }
    },
    [mutateAsync],
  );

  /** Starts a new action (a different sale, a new form): the next submit gets a new key. */
  const startNew = useCallback(() => {
    keyRef.current = null;
    reset();
  }, [reset]);

  return { submit, startNew, isPending: mutation.isPending, error: mutation.error };
}
