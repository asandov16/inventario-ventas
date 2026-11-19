import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toAppError } from '@/shared/api/errors';
import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { addDays, toBusinessDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { showToast } from '@/shared/hooks/feedback';

import {
  changePassword,
  fetchAllCategories,
  fetchAllPaymentMethods,
  fetchExportData,
  fetchLegacySummary,
  fetchMySales,
  fetchUsers,
  registerLegacyBalance,
  saveCategory,
  savePaymentMethod,
  updateBusinessName,
  type CategoryInput,
  type PaymentMethodInput,
} from '../api/profileRepository';
import { backupFileName, buildBackupSheets } from '../domain/backup';
import type { LegacyBalanceInput, SavedLegacyBalance } from '../domain/legacyBalance';
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

/**
 * Descargar respaldo (F7-T09): export_data → seven sheets → respaldo-<fecha>.xlsx.
 * Reading, not writing, so it does not use the write gateway. The Excel
 * library loads only when the button is tapped, to keep the first load small.
 */
export function useDownloadBackup() {
  const mutation = useMutation({
    mutationFn: async () => {
      const [data, { default: writeXlsxFile }] = await Promise.all([
        fetchExportData(),
        import('write-excel-file/browser'),
      ]);
      const sheets = buildBackupSheets(data, PROFILE_MESSAGES.backup.labels);
      const fileName = backupFileName(
        PROFILE_MESSAGES.backup.filePrefix,
        toBusinessDate(new Date(data.generatedAt)),
      );
      await writeXlsxFile(
        sheets.map((sheet) => ({
          sheet: sheet.name,
          stickyRowsCount: 1,
          data: [
            sheet.columns.map((column) => ({ value: column, fontWeight: 'bold' as const })),
            ...sheet.rows,
          ],
        })),
      ).toFile(fileName);
      return { fileName, salesCount: data.sales.length };
    },
    retry: false,
  });
  const { mutateAsync } = mutation;
  const download = useCallback(async (): Promise<SaveOutcome> => {
    try {
      const { fileName, salesCount } = await mutateAsync();
      showToast('ok', PROFILE_MESSAGES.backup.downloaded(fileName, salesCount));
      return { ok: true };
    } catch (error) {
      const message = toAppError(error).message;
      showToast('error', PROFILE_MESSAGES.backup.failed);
      return { ok: false, message };
    }
  }, [mutateAsync]);
  return { download, isPending: mutation.isPending };
}

export function useLegacySummary(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.sales(), 'legacy-summary'],
    queryFn: fetchLegacySummary,
    enabled,
  });
}

export type LegacyOutcome =
  | { type: 'saved'; saved: SavedLegacyBalance }
  | { type: 'failed'; message: string }
  | { type: 'ignored' };

/** Cargar saldo anterior (D-12, F7-T12): one RPC; Por cobrar and Inicio refresh. */
export function useRegisterLegacyBalance() {
  const { submit, startNew, isPending } = useRpcMutation({
    rpc: registerLegacyBalance,
    invalidates: [
      ['receivables'],
      ['sale'],
      queryKeys.sales(),
      queryKeys.badgeCounts(),
      ['summary'],
      ['alerts'],
      ['activity'],
    ],
  });
  const register = useCallback(
    async (input: LegacyBalanceInput): Promise<LegacyOutcome> => {
      const result = await submit(input);
      if (!result.ok) {
        return result.error
          ? { type: 'failed', message: result.error.message }
          : { type: 'ignored' };
      }
      const saved = result.response;
      showToast(
        'ok',
        PROFILE_MESSAGES.legacy.saved(
          saved.customerName,
          formatColones(saved.balanceColones),
          saved.installments.length,
        ),
      );
      return { type: 'saved', saved };
    },
    [submit],
  );
  return { register, startNew, isPending };
}
