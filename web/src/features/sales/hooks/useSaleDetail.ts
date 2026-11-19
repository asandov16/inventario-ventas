import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { showToast } from '@/shared/hooks/feedback';

import { fetchSaleDetail, voidSale, type VoidSaleInput } from '../api/saleDetailRepository';
import { SALES_MESSAGES } from '../messages.es';

/** The sale shown in the sheet; nothing is fetched while it is closed. */
export function useSaleDetail(saleId: string | null) {
  return useQuery({
    queryKey: queryKeys.sale(saleId ?? ''),
    queryFn: () => fetchSaleDetail(saleId ?? ''),
    enabled: saleId !== null,
  });
}

export type VoidOutcome =
  { type: 'voided'; message: string } | { type: 'failed'; message: string } | { type: 'ignored' };

/**
 * CU-05: voids a sale. Totals, lists, stock, alerts and counters refresh; the
 * toast says how many products went back (RN-17). If someone else voided it
 * first, the sheet reloads and shows who and when.
 */
export function useVoidSale() {
  const queryClient = useQueryClient();
  const { submit, isPending } = useRpcMutation({
    rpc: (input: VoidSaleInput) => voidSale(input),
    invalidates: [
      ['sale'],
      queryKeys.sales(),
      queryKeys.products(),
      queryKeys.badgeCounts(),
      ['summary'],
      ['receivables'],
    ],
  });

  const voidIt = useCallback(
    async (input: VoidSaleInput, folio: number): Promise<VoidOutcome> => {
      const result = await submit(input);
      if (!result.ok) {
        if (!result.error) return { type: 'ignored' };
        if (result.error.code === 'already_voided') {
          await queryClient.invalidateQueries({ queryKey: queryKeys.sale(input.saleId) });
        }
        return { type: 'failed', message: result.error.message };
      }
      const message = SALES_MESSAGES.voided(folio, result.response.returned_units);
      showToast('ok', message);
      return { type: 'voided', message };
    },
    [queryClient, submit],
  );

  return { voidIt, isPending };
}
