import type { ReactNode } from 'react';

import styles from './PageTitle.module.css';

interface PageTitleProps {
  title: string;
  /** Short note on the right, e.g. a count or the period. */
  aside?: ReactNode;
}

/** Title at the top of a section panel. */
export function PageTitle({ title, aside }: PageTitleProps) {
  return (
    <div className={styles.pageTitle}>
      <h2 className={styles.title}>{title}</h2>
      {aside !== undefined && <span className={styles.aside}>{aside}</span>}
    </div>
  );
}
