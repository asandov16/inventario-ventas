import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import { searchCustomers } from '../api/customersRepository';
import { isSearchable } from '../domain/customer';

const SEARCH_DEBOUNCE_MS = 250;

/** Matches while typing, 250 ms after the last key (F4-T04). */
export function useCustomerSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = isSearchable(debounced);
  const result = useQuery({
    queryKey: queryKeys.customers(debounced),
    queryFn: () => searchCustomers(debounced),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  return { ...result, enabled, debouncedQuery: debounced };
}
