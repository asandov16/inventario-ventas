import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { formatRelativeTime, formatShortDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { confirm, showToast } from '@/shared/hooks/feedback';

import { registerSale } from '../api/salesRepository';
import type { RegisterSaleInput, SavedSale } from '../domain/sale';
import { SALES_MESSAGES } from '../messages.es';

export type RegisterOutcome =
  | { type: 'saved'; sale: SavedSale }
  | { type: 'cancelled' }
  | { type: 'failed'; message: string; code: string | null }
  | { type: 'ignored' };

/** Errors that mean the catalog on screen is out of date: refresh it. */
const STALE_CATALOG_CODES = new Set(['insufficient_stock', 'total_changed', 'inactive_product']);

function successMessage(sale: SavedSale): string {
  const first = sale.installments[0];
  if (sale.type === 'installments' && sale.months !== null && first) {
    return SALES_MESSAGES.savedInstallments(
      sale.folio,
      sale.months,
      formatColones(first.amountColones),
      formatShortDate(first.dueDate),
    );
  }
  return SALES_MESSAGES.savedCash(sale.folio, formatColones(sale.totalColones));
}

/**
 * Registers a sale (F4-T06): one action, one transaction, through the write
 * gateway. Handles RN-18 (confirm a possible duplicate), refreshes the catalog
 * when stock or prices changed, and ends in a toast with the folio (RN-17).
 */
export function useRegisterSale() {
  const queryClient = useQueryClient();
  const mutation = useRpcMutation({
    rpc: registerSale,
    invalidates: [queryKeys.products(), queryKeys.sales(), ['customers'], queryKeys.badgeCounts()],
  });
  const { submit, startNew } = mutation;

  const register = useCallback(
    async (input: RegisterSaleInput, paymentMethodName?: string): Promise<RegisterOutcome> => {
      let result = await submit(input);

      if (result.ok && result.response.status === 'possible_duplicate') {
        const existing = result.response.existing;
        const registerAnyway = await confirm({
          title: SALES_MESSAGES.duplicateTitle,
          message: SALES_MESSAGES.duplicateMessage(
            existing.folio,
            existing.customerName,
            formatRelativeTime(new Date(existing.clientCreatedAt)),
          ),
          confirmLabel: SALES_MESSAGES.duplicateConfirm,
          cancelLabel: SALES_MESSAGES.duplicateCancel,
        });
        if (!registerAnyway) {
          startNew();
          return { type: 'cancelled' };
        }
        result = await submit(input, { confirmDuplicate: true });
      }

      if (!result.ok) {
        if (!result.error) return { type: 'ignored' };
        if (result.error.code && STALE_CATALOG_CODES.has(result.error.code)) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
        }
        return { type: 'failed', message: result.error.message, code: result.error.code };
      }
      if (result.response.status === 'possible_duplicate') return { type: 'cancelled' };

      const sale: SavedSale = {
        ...result.response.sale,
        ...(paymentMethodName ? { paymentMethodName } : {}),
      };
      queryClient.setQueryData(queryKeys.sale(sale.id), sale);
      showToast('ok', successMessage(sale));
      return { type: 'saved', sale };
    },
    [queryClient, startNew, submit],
  );

  return { register, isPending: mutation.isPending, startNew };
}
