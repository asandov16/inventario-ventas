import { useNavigate } from 'react-router';

import { ACCOUNT_SHEET_PARAM } from '@/features/sales';
import { formatShortDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { Badge } from '@/shared/ui/Badge';
import { cx } from '@/shared/ui/cx';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';

import { sortAlerts, type HomeAlert } from '../domain/home';
import { useAlerts } from '../hooks/useHome';
import { HOME_MESSAGES } from '../messages.es';
import styles from './Home.module.css';

function texts(alert: HomeAlert): { title: string; detail: string; mark: string } {
  const a = HOME_MESSAGES.alert;
  const amount = alert.amount ?? 0;
  const folio = String(alert.folio ?? '—');
  const date = alert.dueDate ? formatShortDate(alert.dueDate) : '—';
  switch (alert.kind) {
    case 'overdue_installment':
      return {
        title: a.overdue_installment(alert.title, formatColones(amount)),
        detail: a.overdue_installmentDetail(folio, date),
        mark: '!',
      };
    case 'upcoming_installment':
      return {
        title: a.upcoming_installment(alert.title),
        detail: a.upcoming_installmentDetail(date, formatColones(amount)),
        mark: '⏰',
      };
    case 'out_of_stock':
      return { title: a.out_of_stock(alert.title), detail: a.productDetail, mark: '0' };
    case 'low_stock':
      return {
        title: a.low_stock(alert.title, String(amount)),
        detail: a.productDetail,
        mark: String(amount),
      };
  }
}

/** Inicio → Estado (CU-12, F7-T03): urgent first; tapping opens the account or the product. */
export function StatusList() {
  const alerts = useAlerts();
  const navigate = useNavigate();

  if (alerts.isPending) return <Loading label={HOME_MESSAGES.statusLoading} />;
  if (alerts.isError) {
    return (
      <ErrorState
        message={alerts.error.message}
        onRetry={() => {
          void alerts.refetch();
        }}
      />
    );
  }
  if (alerts.data.length === 0) {
    return (
      <Empty title={HOME_MESSAGES.statusEmptyTitle}>
        <p>{HOME_MESSAGES.statusEmptyBody}</p>
      </Empty>
    );
  }

  const open = (alert: HomeAlert) => {
    if (alert.entity === 'sale') {
      void navigate(`/por-cobrar?${ACCOUNT_SHEET_PARAM}=${alert.entityId}`);
    } else {
      void navigate(`/inventario?producto=${alert.entityId}`);
    }
  };

  return (
    <ul className={styles.list}>
      {sortAlerts(alerts.data).map((alert) => {
        const { title, detail, mark } = texts(alert);
        const isUrgent = alert.severity === 'urgent';
        return (
          <li key={`${alert.kind}-${alert.entityId}`}>
            <button
              type="button"
              className={styles.row}
              onClick={() => {
                open(alert);
              }}
            >
              <span
                className={cx(styles.mark, isUrgent ? styles.markBad : styles.markWarn)}
                aria-hidden="true"
              >
                {mark}
              </span>
              <span className={styles.main}>
                <span className={styles.text}>{title}</span>
                <span className={styles.meta}>{detail}</span>
              </span>
              <Badge kind={isUrgent ? 'bad' : 'warn'}>
                {HOME_MESSAGES.severity[alert.severity]}
              </Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
