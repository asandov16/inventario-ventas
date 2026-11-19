import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { formatRelativeTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { confirm, showToast } from '@/shared/hooks/feedback';

import {
  fetchReceivables,
  fetchReceivablesSummary,
  recordReminder,
  registerPayment,
  type PaymentInput,
} from '../api/receivablesRepository';
import { RECEIVABLES_MESSAGES } from '../messages.es';

const RECEIVABLES_KEY = ['receivables'] as const;

export function useReceivables() {
  return useQuery({ queryKey: [...RECEIVABLES_KEY, 'list'], queryFn: fetchReceivables });
}

export function useReceivablesSummary() {
  return useQuery({ queryKey: [...RECEIVABLES_KEY, 'summary'], queryFn: fetchReceivablesSummary });
}

/** Everything a payment or a reminder can change. */
const ACCOUNT_KEYS = [
  RECEIVABLES_KEY,
  ['sale'],
  queryKeys.sales(),
  queryKeys.badgeCounts(),
  ['summary'],
] as const;

export type PaymentOutcome =
  | { type: 'saved'; paymentId: string; amountColones: number; balanceColones: number }
  | { type: 'cancelled' }
  | { type: 'failed'; message: string; code: string | null }
  | { type: 'ignored' };

/**
 * CU-06: registers a payment. A same amount on the same account within 10
 * minutes asks first (RN-18). The toast says the new balance, or that the
 * account is paid off (RN-17, RN-08).
 */
export function useRegisterPayment() {
  const { submit, startNew, isPending } = useRpcMutation({
    rpc: registerPayment,
    invalidates: ACCOUNT_KEYS,
  });

  const pay = useCallback(
    async (input: PaymentInput, customerName: string): Promise<PaymentOutcome> => {
      let result = await submit(input);

      if (result.ok && result.response.status === 'possible_duplicate') {
        const { existing } = result.response;
        const again = await confirm({
          title: RECEIVABLES_MESSAGES.duplicateTitle,
          message: RECEIVABLES_MESSAGES.duplicateMessage(
            formatColones(existing.amount),
            customerName,
            formatRelativeTime(new Date(existing.created_at)),
          ),
          confirmLabel: RECEIVABLES_MESSAGES.duplicateConfirm,
          cancelLabel: RECEIVABLES_MESSAGES.duplicateCancel,
        });
        if (!again) {
          startNew();
          return { type: 'cancelled' };
        }
        result = await submit(input, { confirmDuplicate: true });
      }

      if (!result.ok) {
        return result.error
          ? { type: 'failed', message: result.error.message, code: result.error.code }
          : { type: 'ignored' };
      }
      const response = result.response;
      if (response.status === 'possible_duplicate') return { type: 'cancelled' };

      const balance = response.status === 'ok' ? response.balance : response.sale.balance;
      showToast(
        'ok',
        balance === 0
          ? RECEIVABLES_MESSAGES.paidOffToast(customerName)
          : RECEIVABLES_MESSAGES.paymentToast(
              formatColones(response.payment.amount),
              formatColones(balance),
            ),
      );
      return {
        type: 'saved',
        paymentId: response.payment.id,
        amountColones: response.payment.amount,
        balanceColones: balance,
      };
    },
    [startNew, submit],
  );

  return { pay, isPending };
}

/** CU-07: records the reminder only after the person says they sent it. */
export function useRecordReminder() {
  const { submit, isPending } = useRpcMutation({
    rpc: (saleId: string) => recordReminder(saleId),
    invalidates: ACCOUNT_KEYS,
  });

  const record = useCallback(
    async (saleId: string): Promise<{ ok: true } | { ok: false; message: string | null }> => {
      const result = await submit(saleId);
      if (!result.ok) return { ok: false, message: result.error?.message ?? null };
      showToast('ok', RECEIVABLES_MESSAGES.reminderToast);
      return { ok: true };
    },
    [submit],
  );

  return { record, isPending };
}
