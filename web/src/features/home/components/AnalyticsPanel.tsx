import { formatShortDate, formatWeekdayShort } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { Empty } from '@/shared/ui/Empty';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { Segmented } from '@/shared/ui/Segmented';

import { buildBarChart, mixPercent, type Analytics } from '../domain/home';
import { useAnalytics } from '../hooks/useHome';
import { HOME_MESSAGES } from '../messages.es';
import styles from './Home.module.css';

export type Period = 7 | 30;

interface AnalyticsPanelProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

/** Inicio → Análisis (CU-13, F7-T04): the period's numbers and the prototype's SVG charts. */
export function AnalyticsPanel({ period, onPeriodChange }: AnalyticsPanelProps) {
  const analytics = useAnalytics(period);

  return (
    <>
      <div className={styles.period}>
        <Segmented<'7' | '30'>
          label={HOME_MESSAGES.periodLabel}
          value={String(period) as '7' | '30'}
          onChange={(value) => {
            onPeriodChange(value === '7' ? 7 : 30);
          }}
          segments={[
            { value: '7', label: HOME_MESSAGES.period(7) },
            { value: '30', label: HOME_MESSAGES.period(30) },
          ]}
        />
      </div>
      {analytics.isPending ? (
        <Loading label={HOME_MESSAGES.analyticsLoading} />
      ) : analytics.isError ? (
        <ErrorState
          message={analytics.error.message}
          onRetry={() => {
            void analytics.refetch();
          }}
        />
      ) : analytics.data.salesCount === 0 ? (
        <Empty title={HOME_MESSAGES.analyticsEmptyTitle}>
          <p>{HOME_MESSAGES.analyticsEmptyBody}</p>
        </Empty>
      ) : (
        <AnalyticsBody data={analytics.data} />
      )}
    </>
  );
}

function AnalyticsBody({ data }: { data: Analytics }) {
  const mix = mixPercent(data.mix.cashColones, data.mix.installmentsColones);
  const topMax = Math.max(1, ...data.topProducts.map((product) => product.amountColones));
  const categoryMax = Math.max(1, ...data.byCategory.map((category) => category.amountColones));

  return (
    <>
      <KpiGrid>
        <Kpi
          label={HOME_MESSAGES.sold}
          value={formatColones(data.soldColones)}
          hint={HOME_MESSAGES.salesCount(data.salesCount)}
        />
        <Kpi
          label={HOME_MESSAGES.collected}
          value={formatColones(data.collectedColones)}
          hint={HOME_MESSAGES.collectedHint}
        />
        <Kpi
          label={HOME_MESSAGES.average}
          value={formatColones(data.averageSaleColones)}
          hint={HOME_MESSAGES.averageHint}
        />
        {data.grossProfitColones !== null ? (
          // Only with analytics.profit: the database sends nothing otherwise.
          <Kpi
            testId="profit-card"
            label={HOME_MESSAGES.profit}
            value={formatColones(data.grossProfitColones)}
            hint={data.marginPct !== null ? HOME_MESSAGES.marginHint(data.marginPct) : undefined}
          />
        ) : (
          <Kpi
            label={HOME_MESSAGES.salesLabel}
            value={data.salesCount}
            hint={HOME_MESSAGES.salesHint}
          />
        )}
      </KpiGrid>

      <section className={styles.card} aria-labelledby="chart-title">
        <h3 id="chart-title" className={styles.cardTitle}>
          {HOME_MESSAGES.byDay}
        </h3>
        <SalesChart data={data} />
        <p className={styles.legend}>
          <span>
            <i className={styles.swatchCash} />
            {HOME_MESSAGES.legend(HOME_MESSAGES.cash, formatColones(data.mix.cashColones))}
          </span>
          <span>
            <i className={styles.swatchInstallments} />
            {HOME_MESSAGES.legend(
              HOME_MESSAGES.installments,
              formatColones(data.mix.installmentsColones),
            )}
          </span>
        </p>
      </section>

      <section className={styles.card} aria-labelledby="mix-title">
        <h3 id="mix-title" className={styles.cardTitle}>
          {HOME_MESSAGES.mixTitle}
        </h3>
        <div className={styles.mix} aria-hidden="true">
          <i className={styles.swatchCash} style={{ width: `${String(mix.cash)}%` }} />
          <i
            className={styles.swatchInstallments}
            style={{ width: `${String(mix.installments)}%` }}
          />
        </div>
        <p className={styles.legend}>
          <span>
            <i className={styles.swatchCash} />
            {HOME_MESSAGES.mixLegend(HOME_MESSAGES.cash, mix.cash)}
          </span>
          <span>
            <i className={styles.swatchInstallments} />
            {HOME_MESSAGES.mixLegend(HOME_MESSAGES.installments, mix.installments)}
          </span>
        </p>
      </section>

      {data.topProducts.length > 0 && (
        <section className={styles.card} aria-labelledby="top-title">
          <h3 id="top-title" className={styles.cardTitle}>
            {HOME_MESSAGES.topTitle}
          </h3>
          {data.topProducts.map((product) => (
            <HorizontalBar
              key={product.productId}
              label={product.name}
              note={HOME_MESSAGES.topQty(product.qty)}
              valueColones={product.amountColones}
              maxColones={topMax}
            />
          ))}
        </section>
      )}

      {data.byCategory.length > 0 && (
        <section className={styles.card} aria-labelledby="category-title">
          <h3 id="category-title" className={styles.cardTitle}>
            {HOME_MESSAGES.byCategoryTitle}
          </h3>
          {data.byCategory.map((category) => (
            <HorizontalBar
              key={category.category}
              label={category.category}
              valueColones={category.amountColones}
              maxColones={categoryMax}
            />
          ))}
        </section>
      )}
    </>
  );
}

interface HorizontalBarProps {
  label: string;
  note?: string;
  valueColones: number;
  maxColones: number;
}

/** One row of "Productos más vendidos" or "Por categoría" (prototype v2 .hbar). */
function HorizontalBar({ label, note, valueColones, maxColones }: HorizontalBarProps) {
  return (
    <div className={styles.hbar}>
      <span className={styles.hbarLabel}>
        {label} {note && <span className={styles.meta}>{note}</span>}
      </span>
      <span className={styles.hbarTrack} aria-hidden="true">
        <i style={{ width: `${String((valueColones / maxColones) * 100)}%` }} />
      </span>
      <span className={styles.hbarValue}>{formatColones(valueColones)}</span>
    </div>
  );
}

/** "Ventas por día": stacked SVG bars, cash below and installments on top (prototype v2). */
function SalesChart({ data }: { data: Analytics }) {
  const chart = buildBarChart(data.daily);
  const isWeek = data.days === 7;

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${String(chart.width)} ${String(chart.height)}`}
      role="img"
      aria-label={HOME_MESSAGES.byDayLabel}
    >
      {chart.gridLines.map((line) => (
        <g key={line.y}>
          <line
            x1={0}
            x2={chart.width}
            y1={line.y}
            y2={line.y}
            stroke="var(--color-line)"
            strokeDasharray="3 3"
          />
          <text x={0} y={line.y - 3} fontSize={9} fill="var(--color-muted)">
            {formatColones(line.valueColones)}
          </text>
        </g>
      ))}
      {chart.bars.map((bar) => {
        const radius = Math.min(4, bar.width / 2);
        return (
          <g key={bar.date}>
            <title>
              {HOME_MESSAGES.barTitle(formatShortDate(bar.date), formatColones(bar.totalColones))}
            </title>
            {bar.cash.height > 0 && (
              <rect
                x={bar.x}
                y={bar.cash.y}
                width={bar.width}
                height={bar.cash.height}
                rx={bar.installments.height > 0 ? 0 : radius}
                fill="var(--color-series-1)"
              />
            )}
            {bar.installments.height > 0 && (
              <rect
                x={bar.x}
                y={bar.installments.y}
                width={bar.width}
                height={bar.installments.height}
                rx={radius}
                fill="var(--color-series-2)"
              />
            )}
            {bar.showLabel && (
              <text
                x={bar.x + bar.width / 2}
                y={chart.height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-muted)"
              >
                {isWeek ? formatWeekdayShort(bar.date) : String(Number(bar.date.slice(8, 10)))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
