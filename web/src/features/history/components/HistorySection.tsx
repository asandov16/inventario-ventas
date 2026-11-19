import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { formatColones } from '@/shared/domain/money';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePermission } from '@/shared/hooks/usePermission';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Button } from '@/shared/ui/Button';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { PageTitle } from '@/shared/ui/PageTitle';
import { SearchInput } from '@/shared/ui/SearchInput';
import { TextField } from '@/shared/ui/TextField';

import {
  EMPTY_FILTER,
  groupByDay,
  isFiltered,
  type HistoryFilter,
  type HistoryKind,
} from '../domain/history';
import { useSalesHistory, useSellers } from '../hooks/useHistory';
import { HISTORY_MESSAGES } from '../messages.es';
import styles from './History.module.css';
import { SaleRow } from './SaleRow';

/** The shared sale sheet (rendered by the app shell) opens with ?venta=<id>. */
const SALE_SHEET_PARAM = 'venta';
const KINDS: readonly HistoryKind[] = ['all', 'cash', 'installments', 'voided'];

/** Historial (CU-04, F5-T01/T04): sales by day, newest first, loaded as the list scrolls. */
export function HistorySection() {
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_FILTER);
  const [showMore, setShowMore] = useState(false);
  const search = useDebouncedValue(filter.search, 300);
  const queryFilter = useMemo(() => ({ ...filter, search }), [filter, search]);
  const history = useSalesHistory(queryFilter);
  const saleSheet = useUrlSheet(SALE_SHEET_PARAM);
  const canListSellers = usePermission('users.admin');
  const sellers = useSellers(canListSellers && showMore);
  const sellerSelectId = useId();

  const sales = useMemo(
    () => history.data?.pages.flatMap((page) => page.sales) ?? [],
    [history.data],
  );
  const groups = useMemo(() => groupByDay(sales), [sales]);
  const filtered = isFiltered(filter);

  // Infinite load: the next page is fetched when the end of the list comes into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = history;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const update = (changes: Partial<HistoryFilter>) => {
    setFilter((current) => ({ ...current, ...changes }));
  };

  return (
    <>
      <PageTitle
        title={HISTORY_MESSAGES.title}
        aside={history.data ? HISTORY_MESSAGES.count(sales.length, hasNextPage) : undefined}
      />
      <SearchInput
        value={filter.search}
        onChange={(value) => {
          update({ search: value });
        }}
        placeholder={HISTORY_MESSAGES.searchPlaceholder}
        label={HISTORY_MESSAGES.searchLabel}
      />
      <FilterChips
        label={HISTORY_MESSAGES.kindsLabel}
        chips={[
          ...KINDS.map((kind) => ({
            key: kind,
            label: HISTORY_MESSAGES.kinds[kind],
            selected: filter.kind === kind,
            onToggle: () => {
              update({ kind });
            },
          })),
          {
            key: 'more',
            label: showMore ? HISTORY_MESSAGES.lessFilters : HISTORY_MESSAGES.moreFilters,
            selected: showMore,
            onToggle: () => {
              setShowMore((current) => !current);
            },
          },
        ]}
      />

      {showMore && (
        <div className={styles.filters}>
          <TextField
            label={HISTORY_MESSAGES.fromDate}
            type="date"
            value={filter.fromDate ?? ''}
            onChange={(event) => {
              update({ fromDate: event.target.value || null });
            }}
          />
          <TextField
            label={HISTORY_MESSAGES.toDate}
            type="date"
            value={filter.toDate ?? ''}
            onChange={(event) => {
              update({ toDate: event.target.value || null });
            }}
          />
          {canListSellers && sellers.data && sellers.data.length > 0 && (
            <div className={styles.field}>
              <label htmlFor={sellerSelectId} className={styles.fieldLabel}>
                {HISTORY_MESSAGES.seller}
              </label>
              <select
                id={sellerSelectId}
                className={styles.select}
                value={filter.sellerId ?? ''}
                onChange={(event) => {
                  update({ sellerId: event.target.value || null });
                }}
              >
                <option value="">{HISTORY_MESSAGES.anySeller}</option>
                {sellers.data.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {history.isPending ? (
        <Loading label={HISTORY_MESSAGES.loading} />
      ) : history.isError ? (
        <ErrorState
          message={history.error.message}
          onRetry={() => {
            void history.refetch();
          }}
        />
      ) : sales.length === 0 ? (
        <Empty title={filtered ? HISTORY_MESSAGES.noResultsTitle : HISTORY_MESSAGES.emptyTitle}>
          <p>{filtered ? HISTORY_MESSAGES.noResultsBody : HISTORY_MESSAGES.emptyBody}</p>
          {filtered && (
            <Button
              variant="light"
              onClick={() => {
                setFilter(EMPTY_FILTER);
              }}
            >
              {HISTORY_MESSAGES.clearFilters}
            </Button>
          )}
        </Empty>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className={styles.dayHeader}>
                {HISTORY_MESSAGES.dayHeader(group.label, formatColones(group.totalColones))}
              </h3>
              <ul className={styles.list}>
                {group.sales.map((sale) => (
                  <li key={sale.id}>
                    <SaleRow
                      sale={sale}
                      onOpen={() => {
                        saleSheet.open(sale.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div ref={sentinelRef} className={styles.more}>
            {isFetchingNextPage ? (
              <Loading label={HISTORY_MESSAGES.loadingMore} />
            ) : hasNextPage ? (
              <Button
                variant="light"
                onClick={() => {
                  void fetchNextPage();
                }}
              >
                {HISTORY_MESSAGES.loadMore}
              </Button>
            ) : (
              <p className={styles.end}>{HISTORY_MESSAGES.end}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
