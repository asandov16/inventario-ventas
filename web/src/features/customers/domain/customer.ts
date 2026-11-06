import { isValidPhone } from '@/shared/domain/phone';

/** A customer as the sale needs it (from search_customers / create_customer). */
export interface Customer {
  id: string;
  name: string;
  phoneE164: string;
  balanceColones: number;
  overdueColones: number;
}

export interface NewCustomerInput {
  name: string;
  phone: string;
  whatsappOptIn: boolean;
}

const MIN_LETTERS = 2;
const MIN_DIGITS = 3;

/** search_customers only answers from 2 letters or 3 digits; avoid useless calls. */
export function isSearchable(query: string): boolean {
  const letters = (query.match(/\p{L}/gu) ?? []).length;
  const digits = (query.match(/\d/g) ?? []).length;
  return letters >= MIN_LETTERS || digits >= MIN_DIGITS;
}

export interface NewCustomerError {
  field: 'name' | 'phone';
  code: 'invalid_name' | 'invalid_phone';
}

/** Same rules as create_customer, checked before calling it (RN-01). */
export function validateNewCustomer(input: NewCustomerInput): NewCustomerError | null {
  if (input.name.trim().length < 2) return { field: 'name', code: 'invalid_name' };
  if (!isValidPhone(input.phone)) return { field: 'phone', code: 'invalid_phone' };
  return null;
}
