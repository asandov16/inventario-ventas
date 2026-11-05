import type { ReactNode } from 'react';

import styles from './Empty.module.css';

interface EmptyProps {
  title: string;
  children?: ReactNode;
}

/** Friendly empty state: what is missing and, if useful, what to do. */
export function Empty({ title, children }: EmptyProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {children}
    </div>
  );
}
