import { useNavigate } from 'react-router';

import { SALE_SHEET_PARAM } from '@/features/sales';
import { formatRelativeTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Button } from '@/shared/ui/Button';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';

import { activityIcon, dataNumber, dataText, type ActivityEntry } from '../domain/home';
import { useActivity } from '../hooks/useHome';
import { HOME_MESSAGES } from '../messages.es';
import styles from './Home.module.css';

/** The sentence of an entry, written from its type and data (the log stores facts, not text). */
function describe(entry: ActivityEntry): string {
  const t = HOME_MESSAGES.activity;
  const text = (key: string) => dataText(entry, key) ?? '—';
  switch (entry.type) {
    case 'sale':
      return t.sale(text('folio'), text('customer_name'));
    case 'legacy_balance':
      return t.legacy_balance(text('customer_name'));
    case 'payment':
      return t.payment(text('customer_name'), text('folio'));
    case 'void':
      return t.void(text('folio'), dataText(entry, 'reason'));
    case 'restock':
      return t.restock(String(dataNumber(entry, 'qty_delta') ?? '—'), text('product_name'));
    case 'adjustment':
      return t.adjustment(text('product_name'), dataText(entry, 'reason'));
    case 'product_created':
      return t.product_created(text('product_name'), text('code'));
    case 'customer_created':
      return t.customer_created(text('customer_name'));
    case 'reminder':
      return t.reminder(text('customer_name'), text('folio'));
  }
}

/** Inicio → Actividad (F7-T02, RF-FB-07): newest first, loaded as the person asks for more. */
export function ActivityFeed() {
  const activity = useActivity();
  const navigate = useNavigate();
  const saleSheet = useUrlSheet(SALE_SHEET_PARAM);

  if (activity.isPending) return <Loading label={HOME_MESSAGES.activityLoading} />;
  if (activity.isError) {
    return (
      <ErrorState
        message={activity.error.message}
        onRetry={() => {
          void activity.refetch();
        }}
      />
    );
  }
  const entries = activity.data.pages.flatMap((page) => page.entries);
  if (entries.length === 0) {
    return (
      <Empty title={HOME_MESSAGES.activityEmptyTitle}>
        <p>{HOME_MESSAGES.activityEmptyBody}</p>
      </Empty>
    );
  }

  const open = (entry: ActivityEntry) => {
    if (entry.entity === 'sale') {
      saleSheet.open(entry.entityId);
    } else if (entry.entity === 'product') {
      void navigate(`/inventario?producto=${entry.entityId}`);
    }
  };

  return (
    <>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={styles.row}
              disabled={entry.entity === 'customer'}
              onClick={() => {
                open(entry);
              }}
            >
              <span className={styles.icon} aria-hidden="true">
                {activityIcon(entry.type)}
              </span>
              <span className={styles.main}>
                <span className={styles.text}>{describe(entry)}</span>
                <span className={styles.meta}>
                  {HOME_MESSAGES.activityMeta(
                    formatRelativeTime(new Date(entry.createdAt)),
                    entry.actorName,
                  )}
                </span>
              </span>
              {entry.amountColones !== null && (
                <span className={styles.amount}>{formatColones(entry.amountColones)}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {activity.hasNextPage && (
        <div className={styles.more}>
          <Button
            variant="light"
            disabled={activity.isFetchingNextPage}
            onClick={() => {
              void activity.fetchNextPage();
            }}
          >
            {HOME_MESSAGES.activityMore}
          </Button>
        </div>
      )}
    </>
  );
}
