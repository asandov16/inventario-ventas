import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import {
  fetchInventory,
  fetchInventorySummary,
  fetchProductDetail,
} from '../api/inventoryRepository';

export function useInventory() {
  return useQuery({ queryKey: queryKeys.inventory(), queryFn: fetchInventory });
}

export function useInventorySummary() {
  return useQuery({ queryKey: queryKeys.inventorySummary(), queryFn: fetchInventorySummary });
}

/** The product shown in the detail sheet; nothing is fetched while it is closed. */
export function useProductDetail(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.product(productId ?? ''),
    queryFn: () => fetchProductDetail(productId ?? ''),
    enabled: productId !== null,
  });
}
