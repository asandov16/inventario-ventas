import { useMemo, useState } from 'react';

import { usePermission } from '@/shared/hooks/usePermission';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { formatColones } from '@/shared/domain/money';
import { Button } from '@/shared/ui/Button';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { PageTitle } from '@/shared/ui/PageTitle';
import { SearchInput } from '@/shared/ui/SearchInput';

import { categoriesOf, filterInventory } from '../domain/inventory';
import { useInventory, useInventorySummary } from '../hooks/useInventory';
import { INVENTORY_MESSAGES } from '../messages.es';
import styles from './Inventory.module.css';
import { ProductRow } from './ProductRow';
import { ProductSheet } from './ProductSheet';

/** URL parameter of the product detail sheet: /inventario?producto=<id> (ADR-037). */
const PRODUCT_SHEET_PARAM = 'producto';

/** Inventario → Inventario actual (CU-08, F6-T01): totals, search, filters and the list. */
export function InventorySection() {
  const inventory = useInventory();
  const summary = useInventorySummary();
  const canSeeCosts = usePermission('costs.read');
  const productSheet = useUrlSheet(PRODUCT_SHEET_PARAM);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);

  const products = useMemo(() => inventory.data ?? [], [inventory.data]);
  const categories = useMemo(() => categoriesOf(products), [products]);
  const visible = useMemo(
    () => filterInventory(products, { query, categoryId, lowOnly }),
    [products, query, categoryId, lowOnly],
  );

  const clearFilters = () => {
    setQuery('');
    setCategoryId(null);
    setLowOnly(false);
  };

  return (
    <>
      <PageTitle
        title={INVENTORY_MESSAGES.title}
        aside={inventory.data ? INVENTORY_MESSAGES.productsCount(products.length) : undefined}
      />

      {summary.data && (
        <KpiGrid>
          <Kpi label={INVENTORY_MESSAGES.units} value={summary.data.units} />
          <Kpi
            label={INVENTORY_MESSAGES.valueAtPrice}
            value={formatColones(summary.data.valueAtPriceColones)}
          />
          {canSeeCosts && summary.data.valueAtCostColones !== null && (
            <Kpi
              label={INVENTORY_MESSAGES.valueAtCost}
              value={formatColones(summary.data.valueAtCostColones)}
            />
          )}
        </KpiGrid>
      )}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={INVENTORY_MESSAGES.searchPlaceholder}
        label={INVENTORY_MESSAGES.searchLabel}
      />
      <FilterChips
        label={INVENTORY_MESSAGES.filtersLabel}
        chips={[
          ...[{ id: null, name: INVENTORY_MESSAGES.allCategories }, ...categories].map(
            (category) => ({
              key: category.id ?? 'all',
              label: category.name,
              selected: categoryId === category.id,
              onToggle: () => {
                setCategoryId(category.id);
              },
            }),
          ),
          {
            key: 'low',
            label: INVENTORY_MESSAGES.lowStockChip,
            selected: lowOnly,
            onToggle: () => {
              setLowOnly((current) => !current);
            },
          },
        ]}
      />

      {inventory.isPending ? (
        <Loading label={INVENTORY_MESSAGES.loading} />
      ) : inventory.isError ? (
        <ErrorState
          onRetry={() => {
            void inventory.refetch();
          }}
        />
      ) : products.length === 0 ? (
        <Empty title={INVENTORY_MESSAGES.noProductsTitle}>
          <p>{INVENTORY_MESSAGES.noProductsBody}</p>
        </Empty>
      ) : visible.length === 0 ? (
        <Empty title={INVENTORY_MESSAGES.noResultsTitle}>
          <p>{INVENTORY_MESSAGES.noResultsBody}</p>
          <Button variant="light" onClick={clearFilters}>
            {INVENTORY_MESSAGES.clearFilters}
          </Button>
        </Empty>
      ) : (
        <ul className={styles.list}>
          {visible.map((product) => (
            <li key={product.id}>
              <ProductRow
                product={product}
                onOpen={() => {
                  productSheet.open(product.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <ProductSheet productId={productSheet.value} onClose={productSheet.close} />
    </>
  );
}
