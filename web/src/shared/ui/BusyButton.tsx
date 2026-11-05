import { Button, type ButtonProps } from './Button';
import styles from './BusyButton.module.css';

interface BusyButtonProps extends ButtonProps {
  busy: boolean;
  /** What is happening while saving, e.g. "Registrando…" (section 4.1). */
  busyLabel: string;
}

/** Disabled with a spinner and a label while saving, so a double tap cannot repeat it. */
export function BusyButton({ busy, busyLabel, children, disabled, ...rest }: BusyButtonProps) {
  return (
    <Button {...rest} disabled={busy || disabled} aria-busy={busy}>
      {busy ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
