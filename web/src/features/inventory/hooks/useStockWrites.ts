import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/shared/api/queryKeys';
import { useRpcMutation } from '@/shared/api/useRpcMutation';
import { formatRelativeTime } from '@/shared/domain/dates';
import { confirm, showToast } from '@/shared/hooks/feedback';

import {
  createProduct,
  fetchCategories,
  fetchRecentRestocks,
  restockProduct,
  updateProduct,
} from '../api/stockRepository';
import type {
  NewProductInput,
  RestockInput,
  SavedProduct,
  SimilarProduct,
  UpdateProductInput,
} from '../domain/stockForms';
import { INVENTORY_MESSAGES } from '../messages.es';

/** Everything a stock change can move: lists, totals, details, alerts and counters. */
const STOCK_KEYS = [queryKeys.products(), queryKeys.badgeCounts(), ['summary']] as const;

export function useRecentRestocks() {
  return useQuery({ queryKey: queryKeys.recentRestocks(), queryFn: () => fetchRecentRestocks() });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
}

export type RestockOutcome =
  | { type: 'saved'; product: SavedProduct; message: string }
  | { type: 'cancelled' }
  | { type: 'failed'; message: string }
  | { type: 'ignored' };

/**
 * CU-09: adds units to a product. A same product and quantity within 10 minutes
 * asks first (RN-18); the toast says the stock before and after (RN-17).
 */
export function useRestock() {
  const { submit, startNew, isPending } = useRpcMutation({
    rpc: restockProduct,
    invalidates: STOCK_KEYS,
  });

  const restock = useCallback(
    async (input: RestockInput): Promise<RestockOutcome> => {
      let result = await submit(input);

      if (result.ok && result.response.status === 'possible_duplicate') {
        const { existing, product } = result.response;
        const again = await confirm({
          title: INVENTORY_MESSAGES.restockDuplicateTitle,
          message: INVENTORY_MESSAGES.restockDuplicateMessage(
            existing.qty,
            product.name,
            formatRelativeTime(new Date(existing.created_at)),
          ),
          confirmLabel: INVENTORY_MESSAGES.restockDuplicateConfirm,
          cancelLabel: INVENTORY_MESSAGES.restockDuplicateCancel,
        });
        if (!again) {
          startNew();
          return { type: 'cancelled' };
        }
        result = await submit(input, { confirmDuplicate: true });
      }

      if (!result.ok) {
        return result.error
          ? { type: 'failed', message: result.error.message }
          : { type: 'ignored' };
      }
      if (result.response.status === 'possible_duplicate') return { type: 'cancelled' };

      const { product, stock_before: before, stock_after: after } = result.response;
      const message = INVENTORY_MESSAGES.restockSaved(product.name, before, after);
      showToast('ok', message);
      return { type: 'saved', product, message };
    },
    [startNew, submit],
  );

  return { restock, isPending };
}

export type CreateProductOutcome =
  | { type: 'saved'; product: SavedProduct; message: string }
  | { type: 'similar'; candidates: SimilarProduct[] }
  | { type: 'failed'; message: string }
  | { type: 'ignored' };

/** CU-10: creates a product; a very similar name is shown first (status `similar`). */
export function useCreateProduct() {
  const { submit, startNew, isPending } = useRpcMutation({
    rpc: createProduct,
    invalidates: STOCK_KEYS,
  });

  const create = useCallback(
    async (input: NewProductInput, confirmSimilar = false): Promise<CreateProductOutcome> => {
      const result = await submit({ ...input, confirmSimilar });
      if (!result.ok) {
        return result.error
          ? { type: 'failed', message: result.error.message }
          : { type: 'ignored' };
      }
      if (result.response.status === 'similar') {
        return { type: 'similar', candidates: result.response.candidates };
      }
      const { product } = result.response;
      const message = INVENTORY_MESSAGES.productCreated(product.name, product.code, product.stock);
      showToast('ok', message);
      return { type: 'saved', product, message };
    },
    [submit],
  );

  return { create, startNew, isPending };
}

export type UpdateProductOutcome =
  | { type: 'saved' }
  | { type: 'stale'; message: string }
  | { type: 'failed'; message: string }
  | { type: 'ignored' };

/**
 * CU-11 and RF-INV-05: saves an edit or deactivates. When someone else saved
 * first (concurrent_update), the product reloads so the form shows the new data.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { submit, isPending } = useRpcMutation({
    rpc: (input: UpdateProductInput) => updateProduct(input),
    invalidates: STOCK_KEYS,
  });

  const save = useCallback(
    async (input: UpdateProductInput): Promise<UpdateProductOutcome> => {
      const result = await submit(input);
      if (!result.ok) {
        if (!result.error) return { type: 'ignored' };
        if (result.error.code === 'concurrent_update') {
          await queryClient.invalidateQueries({ queryKey: queryKeys.product(input.productId) });
          return { type: 'stale', message: INVENTORY_MESSAGES.changedWhileEditing };
        }
        return { type: 'failed', message: result.error.message };
      }
      const { product, stock_adjusted: adjusted } = result.response;
      showToast(
        'ok',
        input.active === false
          ? INVENTORY_MESSAGES.deactivated(product.name)
          : adjusted
            ? INVENTORY_MESSAGES.savedWithAdjustment(adjusted.from, adjusted.to)
            : INVENTORY_MESSAGES.saved(product.name),
      );
      return { type: 'saved' };
    },
    [queryClient, submit],
  );

  return { save, isPending };
}
