import { useMemo, useState } from 'react';

import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Button } from '@/shared/ui/Button';
import { cx } from '@/shared/ui/cx';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { PageTitle } from '@/shared/ui/PageTitle';

import { categoriesOf, filterCatalog } from '../domain/catalog';
import { useCart } from '../hooks/useCart';
import { useCatalog, usePaymentMethods } from '../hooks/useCatalog';
import { SALES_MESSAGES } from '../messages.es';
import { CartBar } from './CartBar';
import { CheckoutSheet } from './CheckoutSheet';
import { ProductCard } from './ProductCard';
import styles from './Sell.module.css';

/** URL parameter of the checkout sheet: /vender?cobrar=1 (ADR-037). */
const CHECKOUT_SHEET_PARAM = 'cobrar';

/** Vender (CU-01, F4-T01 to T03): catalog, cart and the checkout sheet. */
export function SellSection() {
  const catalog = useCatalog();
  const paymentMethods = usePaymentMethods();
  const products = useMemo(() => catalog.data ?? [], [catalog.data]);
  const cart = useCart(products);
  const checkoutSheet = useUrlSheet(CHECKOUT_SHEET_PARAM);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const categories = useMemo(() => categoriesOf(products), [products]);
  const visible = useMemo(
    () => filterCatalog(products, query, categoryId),
    [products, query, categoryId],
  );

  return (
    <>
      <PageTitle title={SALES_MESSAGES.title} aside={SALES_MESSAGES.subtitle} />

      <input
        type="search"
        className={styles.search}
        placeholder={SALES_MESSAGES.searchPlaceholder}
        aria-label={SALES_MESSAGES.searchLabel}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {categories.length > 1 && (
        <div className={styles.chips} role="group" aria-label={SALES_MESSAGES.categoriesLabel}>
          {[{ id: null, name: SALES_MESSAGES.allCategories }, ...categories].map((category) => (
            <button
              key={category.id ?? 'all'}
              type="button"
              className={cx(styles.chip, categoryId === category.id && styles.chipSelected)}
              aria-pressed={categoryId === category.id}
              onClick={() => {
                setCategoryId(category.id);
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {catalog.isPending ? (
        <Loading label={SALES_MESSAGES.loadingCatalog} />
      ) : catalog.isError ? (
        <ErrorState
          onRetry={() => {
            void catalog.refetch();
          }}
        />
      ) : products.length === 0 ? (
        <Empty title={SALES_MESSAGES.noProductsTitle}>
          <p>{SALES_MESSAGES.noProductsBody}</p>
        </Empty>
      ) : visible.length === 0 ? (
        <Empty title={SALES_MESSAGES.noResultsTitle}>
          <Button
            variant="light"
            onClick={() => {
              setQuery('');
              setCategoryId(null);
            }}
          >
            {SALES_MESSAGES.clearFilters}
          </Button>
        </Empty>
      ) : (
        <div className={styles.grid}>
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inCart={cart.quantityOf(product.id)}
              onAdd={cart.add}
            />
          ))}
        </div>
      )}

      {cart.units > 0 && (
        <CartBar
          units={cart.units}
          totalColones={cart.totalColones}
          onClear={() => {
            cart.clear();
          }}
          onCharge={() => {
            checkoutSheet.open();
          }}
        />
      )}

      <CheckoutSheet
        open={checkoutSheet.isOpen}
        onClose={checkoutSheet.close}
        cart={cart}
        paymentMethods={paymentMethods.data ?? []}
      />
    </>
  );
}
