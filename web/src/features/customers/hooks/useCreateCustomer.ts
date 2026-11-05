import { useCallback } from 'react';

import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { confirm, showToast } from '@/shared/hooks/feedback';

import { createCustomer } from '../api/customersRepository';
import type { Customer, NewCustomerInput } from '../domain/customer';
import { CUSTOMERS_MESSAGES } from '../messages.es';

export type CreateCustomerOutcome =
  | { type: 'saved'; customer: Customer }
  | { type: 'use_existing'; customer: Customer }
  | { type: 'correct_phone' }
  | { type: 'failed'; message: string }
  | { type: 'ignored' };

/**
 * Creates a customer from the sale (CU-03). When the phone already exists,
 * asks whether it is the same person; never creates a duplicate.
 */
export function useCreateCustomer() {
  const mutation = useRpcMutation({
    rpc: createCustomer,
    invalidates: [['customers']],
  });
  const { submit, startNew } = mutation;

  const create = useCallback(
    async (input: NewCustomerInput): Promise<CreateCustomerOutcome> => {
      const result = await submit(input);
      if (!result.ok) {
        return result.error
          ? { type: 'failed', message: result.error.message }
          : { type: 'ignored' };
      }
      const { status, customer } = result.response;
      if (status === 'exists') {
        startNew();
        const sameCustomer = await confirm({
          title: CUSTOMERS_MESSAGES.existsTitle,
          message: CUSTOMERS_MESSAGES.existsMessage(customer.name),
          confirmLabel: CUSTOMERS_MESSAGES.existsConfirm,
          cancelLabel: CUSTOMERS_MESSAGES.existsCancel,
        });
        if (!sameCustomer) return { type: 'correct_phone' };
        showToast('ok', CUSTOMERS_MESSAGES.selected(customer.name));
        return { type: 'use_existing', customer };
      }
      showToast('ok', CUSTOMERS_MESSAGES.saved(customer.name));
      return { type: 'saved', customer };
    },
    [startNew, submit],
  );

  return { create, isPending: mutation.isPending, startNew };
}
