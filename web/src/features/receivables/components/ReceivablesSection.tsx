import { useMemo, useState } from 'react';

import { ACCOUNT_SHEET_PARAM } from '@/features/sales';
import { formatRelativeTime, formatShortDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { cx } from '@/shared/ui/cx';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { PageTitle } from '@/shared/ui/PageTitle';
import { Segmented } from '@/shared/ui/Segmented';

import { overdueCustomers, splitAccounts, type ReceivableAccount } from '../domain/receivables';
import { useReceivables, useReceivablesSummary } from '../hooks/useReceivables';
import { RECEIVABLES_MESSAGES } from '../messages.es';
import styles from './Receivables.module.css';

type Tab = 'open' | 'settled';

function rowMeta(account: ReceivableAccount): string {
  const parts = [`#${String(account.folio)}`];
  if (account.balanceColones === 0) parts.push(RECEIVABLES_MESSAGES.rowSettled);
  else if (account.status === 'overdue' && account.nextDueDate) {
    parts.push(RECEIVABLES_MESSAGES.rowOverdue(formatShortDate(account.nextDueDate)));
  } else if (account.nextDueDate) {
    parts.push(RECEIVABLES_MESSAGES.rowNext(formatShortDate(account.nextDueDate)));
  }
  if (account.lastReminderAt && account.balanceColones > 0) {
    parts.push(
      RECEIVABLES_MESSAGES.rowReminded(formatRelativeTime(new Date(account.lastReminderAt))),
    );
  }
  return parts.join(' · ');
}

/** Por cobrar (CU-06, F5-T05): the three numbers and the accounts, overdue first and in red. */
export function ReceivablesSection() {
  const accounts = useReceivables();
  const summary = useReceivablesSummary();
  const accountSheet = useUrlSheet(ACCOUNT_SHEET_PARAM);
  const [tab, setTab] = useState<Tab>('open');

  const { open, settled } = useMemo(() => splitAccounts(accounts.data ?? []), [accounts.data]);
  const list = tab === 'open' ? open : settled;

  return (
    <>
      <PageTitle title={RECEIVABLES_MESSAGES.title} aside={RECEIVABLES_MESSAGES.aside} />

      {summary.data && accounts.data && (
        <KpiGrid>
          <Kpi
            label={RECEIVABLES_MESSAGES.totalLabel}
            value={formatColones(summary.data.receivableColones)}
            hint={RECEIVABLES_MESSAGES.accountsHint(open.length)}
          />
          <Kpi
            label={RECEIVABLES_MESSAGES.overdueLabel}
            value={
              <span className={cx(summary.data.overdueColones > 0 && styles.badText)}>
                {formatColones(summary.data.overdueColones)}
              </span>
            }
            hint={RECEIVABLES_MESSAGES.customersHint(overdueCustomers(open))}
          />
          <Kpi
            label={RECEIVABLES_MESSAGES.next7Label}
            value={formatColones(summary.data.dueNext7DaysColones)}
            hint={RECEIVABLES_MESSAGES.next7Hint}
          />
        </KpiGrid>
      )}

      <Segmented<Tab>
        label={RECEIVABLES_MESSAGES.tabsLabel}
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'open', label: RECEIVABLES_MESSAGES.tabOpen(open.length) },
          { value: 'settled', label: RECEIVABLES_MESSAGES.tabSettled(settled.length) },
        ]}
      />

      {accounts.isPending ? (
        <Loading label={RECEIVABLES_MESSAGES.loading} />
      ) : accounts.isError ? (
        <ErrorState
          message={accounts.error.message}
          onRetry={() => {
            void accounts.refetch();
          }}
        />
      ) : list.length === 0 ? (
        <Empty
          title={
            tab === 'open' ? RECEIVABLES_MESSAGES.emptyOpen : RECEIVABLES_MESSAGES.emptySettled
          }
        />
      ) : (
        <ul className={styles.list}>
          {list.map((account) => (
            <li key={account.saleId}>
              <button
                type="button"
                className={styles.row}
                aria-label={RECEIVABLES_MESSAGES.rowLabel(account.customerName, account.folio)}
                onClick={() => {
                  accountSheet.open(account.saleId);
                }}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {account.customerName.charAt(0)}
                </span>
                <span className={styles.main}>
                  <span className={styles.name}>{account.customerName}</span>
                  <span className={cx(styles.meta, account.status === 'overdue' && styles.badText)}>
                    {rowMeta(account)}
                  </span>
                  <span className={styles.bar} aria-hidden="true">
                    <i style={{ width: `${String(Math.min(100, account.progressPct))}%` }} />
                  </span>
                </span>
                <span className={styles.end}>
                  <strong>{formatColones(account.balanceColones)}</strong>
                  <span className={styles.meta}>
                    {RECEIVABLES_MESSAGES.rowOf(formatColones(account.totalColones))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
