import type { ReactNode } from 'react';

import styles from './Banner.module.css';
import { cx } from './cx';

type BannerKind = 'ok' | 'error' | 'warn' | 'info';

const ICONS: Record<BannerKind, string> = { ok: '✓', error: '!', warn: '!', info: 'i' };

interface BannerProps {
  kind: BannerKind;
  title: string;
  children?: ReactNode;
}

/** Message that stays on screen inside a form or a sheet; errors stay until fixed (RF-FB-06). */
export function Banner({ kind, title, children }: BannerProps) {
  return (
    <div className={cx(styles.banner, styles[kind])} role={kind === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon} aria-hidden="true">
        {ICONS[kind]}
      </span>
      <div>
        <p className={styles.title}>{title}</p>
        {children !== undefined && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  );
}
