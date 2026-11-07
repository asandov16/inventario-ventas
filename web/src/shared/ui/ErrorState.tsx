import { Button } from './Button';
import styles from './ErrorState.module.css';
import { UI_MESSAGES } from './messages.es';

interface ErrorStateProps {
  /** Defaults to "No se pudo cargar. Revisa tu internet y toca Reintentar." */
  message?: string;
  onRetry: () => void;
}

/** A read that failed: what happened and a way out (Reintentar). */
export function ErrorState({ message = UI_MESSAGES.loadFailed, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorState} role="alert">
      <p className={styles.message}>{message}</p>
      <Button variant="light" onClick={onRetry}>
        {UI_MESSAGES.retry}
      </Button>
    </div>
  );
}

/** Quiet placeholder while something loads. */
export function Loading({ label = UI_MESSAGES.loading }: { label?: string }) {
  return (
    <p className={styles.loading} role="status">
      {label}
    </p>
  );
}
