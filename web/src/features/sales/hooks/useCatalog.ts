import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import { fetchCatalog, fetchPaymentMethods } from '../api/salesRepository';

export function useCatalog() {
  return useQuery({ queryKey: queryKeys.products(), queryFn: fetchCatalog });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: fetchPaymentMethods,
    staleTime: 5 * 60_000,
  });
}
