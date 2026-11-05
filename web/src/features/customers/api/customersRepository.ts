import { z } from 'zod';

import { callRpc, type RpcResponse } from '@/shared/api/rpc';
import type { RpcCallContext } from '@/shared/api/useRpcMutation';
import { toE164 } from '@/shared/domain/phone';

import type { Customer, NewCustomerInput } from '../domain/customer';

const customerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    phone_e164: z.string(),
    balance: z.number().int(),
    overdue_amount: z.number().int(),
  })
  .transform((row): Customer => ({
    id: row.id,
    name: row.name,
    phoneE164: row.phone_e164,
    balanceColones: row.balance,
    overdueColones: row.overdue_amount,
  }));

const searchResponseSchema = z.object({ customers: z.array(customerSchema) });

const createResponseSchema = z.object({
  status: z.enum(['ok', 'replay', 'exists']),
  customer: customerSchema,
});

export interface CreateCustomerResponse extends RpcResponse {
  status: 'ok' | 'replay' | 'exists';
  customer: Customer;
}

const SEARCH_LIMIT = 5;

/** Name without accents, or phone digits; with balance and overdue (CU-03). */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const response = await callRpc('search_customers', { p_query: query, p_limit: SEARCH_LIMIT });
  return searchResponseSchema.parse(response).customers;
}

/**
 * Creates a customer. The id is generated on the device and reused on retry
 * (D-05), so a repeated request answers `replay` instead of creating twice.
 * `exists` means the phone is already registered (RN-01).
 */
export async function createCustomer(
  input: NewCustomerInput,
  { idempotencyKey }: RpcCallContext,
): Promise<CreateCustomerResponse> {
  const response = await callRpc('create_customer', {
    p_id: idempotencyKey,
    p_name: input.name.trim(),
    p_phone: toE164(input.phone) ?? input.phone,
    p_whatsapp_opt_in: input.whatsappOptIn,
  });
  return createResponseSchema.parse(response);
}
