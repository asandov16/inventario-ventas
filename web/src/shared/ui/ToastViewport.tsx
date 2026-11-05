import { cx } from './cx';
import styles from './ToastViewport.module.css';

export interface ToastView {
  id: number;
  kind: 'ok' | 'error' | 'info';
  message: string;
}

const ICONS: Record<ToastView['kind'], string> = { ok: '✓', error: '!', info: 'i' };

/**
 * Toasts at the top of the screen so they never cover buttons (RF-FB-06).
 * Announced politely by screen readers; errors are announced right away.
 */
export function ToastViewport({ toasts }: { toasts: readonly ToastView[] }) {
  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(styles.toast, styles[toast.kind])}
          role={toast.kind === 'error' ? 'alert' : undefined}
        >
          <span className={styles.icon} aria-hidden="true">
            {ICONS[toast.kind]}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
