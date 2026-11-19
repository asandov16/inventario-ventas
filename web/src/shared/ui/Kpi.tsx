import type { ReactNode } from 'react';

import styles from './Kpi.module.css';

/** Row of number tiles (prototype v2 .kpis); two per row on a phone, more on wider screens. */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

interface KpiProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

/** One number with its label (prototype v2 .kpi). */
export function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className={styles.kpi}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
