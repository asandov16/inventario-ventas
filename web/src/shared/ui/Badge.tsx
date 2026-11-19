import type { ReactNode } from 'react';

import styles from './Badge.module.css';
import { cx } from './cx';

export type BadgeKind = 'ok' | 'warn' | 'bad' | 'muted' | 'gold' | 'brand';

/** Small status label (prototype v2 .badge): OK / Bajo / Agotado, Pagada / Vencida… */
export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return <span className={cx(styles.badge, styles[kind])}>{children}</span>;
}
