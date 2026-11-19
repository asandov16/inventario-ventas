import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useCurrentProfile } from '@/features/session';
import { formatLongDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { cx } from '@/shared/ui/cx';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { PageTitle } from '@/shared/ui/PageTitle';
import { Segmented } from '@/shared/ui/Segmented';

import { firstName, greetingFor } from '../domain/home';
import { useDashboardSummary } from '../hooks/useHome';
import { HOME_MESSAGES } from '../messages.es';
import { ActivityFeed } from './ActivityFeed';
import { AnalyticsPanel, type Period } from './AnalyticsPanel';
import styles from './Home.module.css';
import { StatusList } from './StatusList';

type Tab = 'activity' | 'status' | 'analytics';

/** Inicio (CU-12, CU-13, F7-T01): greeting, four tappable numbers and three views. */
export function HomeSection() {
  const profile = useCurrentProfile();
  const summary = useDashboardSummary();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('activity');
  const [period, setPeriod] = useState<Period>(7);
  const now = new Date();

  return (
    <>
      <PageTitle
        title={HOME_MESSAGES.greeting[greetingFor(now.getHours())](firstName(profile.fullName))}
        aside={formatLongDate(now)}
      />

      {summary.data && (
        <KpiGrid>
          <Kpi
            label={HOME_MESSAGES.salesToday}
            value={formatColones(summary.data.salesTodayColones)}
            onClick={() => {
              void navigate('/historial', { replace: true });
            }}
          />
          <Kpi
            label={HOME_MESSAGES.sales30Days}
            value={formatColones(summary.data.sales30DaysColones)}
            onClick={() => {
              setPeriod(30);
              setTab('analytics');
            }}
          />
          <Kpi
            label={HOME_MESSAGES.receivable}
            value={formatColones(summary.data.receivableColones)}
            onClick={() => {
              void navigate('/por-cobrar', { replace: true });
            }}
          />
          <Kpi
            label={HOME_MESSAGES.lowStock}
            value={
              <span className={cx(summary.data.lowStockCount > 0 && styles.warnText)}>
                {summary.data.lowStockCount}
              </span>
            }
            hint={HOME_MESSAGES.lowStockHint(summary.data.lowStockCount)}
            onClick={() => {
              void navigate('/inventario', { replace: true });
            }}
          />
        </KpiGrid>
      )}

      <Segmented<Tab>
        label={HOME_MESSAGES.tabsLabel}
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'activity', label: HOME_MESSAGES.tabs.activity },
          { value: 'status', label: HOME_MESSAGES.tabs.status },
          { value: 'analytics', label: HOME_MESSAGES.tabs.analytics },
        ]}
      />

      {tab === 'activity' && <ActivityFeed />}
      {tab === 'status' && <StatusList />}
      {tab === 'analytics' && <AnalyticsPanel period={period} onPeriodChange={setPeriod} />}
    </>
  );
}
