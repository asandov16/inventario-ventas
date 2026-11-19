import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { addDays, toBusinessDate } from '@/shared/domain/dates';
import { showToast } from '@/shared/hooks/feedback';

import {
  changePassword,
  fetchAllCategories,
  fetchAllPaymentMethods,
  fetchMySales,
  fetchUsers,
  saveCategory,
  savePaymentMethod,
  updateBusinessName,
  type CategoryInput,
  type PaymentMethodInput,
} from '../api/profileRepository';
import { PROFILE_MESSAGES } from '../messages.es';

export function useMySales(userId: string) {
  const fromDate = addDays(toBusinessDate(new Date()), -29);
  return useQuery({
    queryKey: [...queryKeys.sales(), 'mine', userId, fromDate],
    queryFn: () => fetchMySales(userId, fromDate),
  });
}

export type SaveOutcome = { ok: true } | { ok: false; message: string | null };

/**
 * Cambiar contraseña (CU-14). Not an RPC: it goes to Supabase Auth, through
 * shared/api/auth, so it does not use the write gateway.
 */
export function useChangePassword() {
  const mutation = useMutation({ mutationFn: changePassword, retry: false });
  const { mutateAsync } = mutation;
  const change = useCallback(
    async (password: string): Promise<SaveOutcome> => {
      try {
        await mutateAsync(password);
        showToast('ok', PROFILE_MESSAGES.passwordChanged);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : null };
      }
    },
    [mutateAsync],
  );
  return { change, isPending: mutation.isPending };
}

export function useAllCategories(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.categories(), 'all'],
    queryFn: fetchAllCategories,
    enabled,
  });
}

export function useAllPaymentMethods(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.paymentMethods(), 'all'],
    queryFn: fetchAllPaymentMethods,
    enabled,
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({ queryKey: ['users', 'all'], queryFn: fetchUsers, enabled });
}

function toOutcome(result: { ok: boolean; error?: { message: string } | null }): SaveOutcome {
  if (result.ok) return { ok: true };
  return { ok: false, message: result.error?.message ?? null };
}

/** D-19: the header and the WhatsApp messages read the name from the profile, so it reloads. */
export function useUpdateBusinessName() {
  const { submit, isPending } = useRpcMutation({
    rpc: (name: string) => updateBusinessName(name),
    invalidates: [['profile']],
  });
  const save = useCallback(
    async (name: string): Promise<SaveOutcome> => {
      const result = await submit(name);
      if (result.ok) showToast('ok', PROFILE_MESSAGES.businessSaved(name.trim()));
      return toOutcome(result);
    },
    [submit],
  );
  return { save, isPending };
}

export function useSaveCategory() {
  const { submit, isPending } = useRpcMutation({
    rpc: (input: CategoryInput) => saveCategory(input),
    invalidates: [queryKeys.categories(), queryKeys.products()],
  });
  const save = useCallback(
    async (input: CategoryInput, message: string): Promise<SaveOutcome> => {
      const result = await submit(input);
      if (result.ok) showToast('ok', message);
      return toOutcome(result);
    },
    [submit],
  );
  return { save, isPending };
}

export function useSavePaymentMethod() {
  const { submit, isPending } = useRpcMutation({
    rpc: (input: PaymentMethodInput) => savePaymentMethod(input),
    invalidates: [queryKeys.paymentMethods()],
  });
  const save = useCallback(
    async (input: PaymentMethodInput, message: string): Promise<SaveOutcome> => {
      const result = await submit(input);
      if (result.ok) showToast('ok', message);
      return toOutcome(result);
    },
    [submit],
  );
  return { save, isPending };
}
