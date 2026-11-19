import type { ReactNode } from 'react';

import { cx } from './cx';
import styles from './Kpi.module.css';

/** Row of number tiles (prototype v2 .kpis); two per row on a phone, more on wider screens. */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

interface KpiProps {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  /** Makes the tile tappable: it takes the person to the detail (RF-DSH-01). */
  onClick?: () => void;
  testId?: string;
}

/** One number with its label (prototype v2 .kpi). */
export function Kpi({ label, value, hint, onClick, testId }: KpiProps) {
  const content = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={cx(styles.kpi, styles.tappable)}
        onClick={onClick}
        data-testid={testId}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={styles.kpi} data-testid={testId}>
      {content}
    </div>
  );
}
