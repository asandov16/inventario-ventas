import { SaleStatusBadge } from '@/features/sales';
import { formatTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { cx } from '@/shared/ui/cx';

import type { HistorySale } from '../domain/history';
import { HISTORY_MESSAGES } from '../messages.es';
import styles from './History.module.css';

function iconOf(sale: HistorySale): string {
  if (sale.source === 'legacy_import') return '📒';
  return sale.type === 'cash' ? '💵' : '🗓️';
}

/** One sale: customer, folio, items and time, total and its label (F5-T01). */
export function SaleRow({ sale, onOpen }: { sale: HistorySale; onOpen: () => void }) {
  const isVoided = sale.status === 'voided';
  return (
    <button
      type="button"
      className={styles.row}
      onClick={onOpen}
      aria-label={HISTORY_MESSAGES.rowLabel(sale.customerName, sale.folio)}
    >
      <span
        className={cx(
          styles.icon,
          sale.type === 'cash' ? styles.iconCash : styles.iconInstallments,
        )}
        aria-hidden="true"
      >
        {iconOf(sale)}
      </span>
      <span className={styles.main}>
        <span className={styles.name}>{sale.customerName}</span>
        <span className={styles.meta}>
          {sale.source === 'legacy_import'
            ? HISTORY_MESSAGES.rowMetaLegacy(sale.folio, sale.description)
            : HISTORY_MESSAGES.rowMeta(
                sale.folio,
                sale.itemsCount,
                formatTime(new Date(sale.clientCreatedAt)),
              )}
        </span>
      </span>
      <span className={styles.end}>
        <span className={cx(styles.total, isVoided && styles.struck)}>
          {formatColones(sale.totalColones)}
        </span>
        <SaleStatusBadge status={sale.status} type={sale.type} source={sale.source} months={null} />
      </span>
    </button>
  );
}
