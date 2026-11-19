import { useId } from 'react';

import { parseQuantity } from '../domain/stockForms';
import { INVENTORY_MESSAGES } from '../messages.es';
import styles from './Inventory.module.css';

interface QuantityFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

/** Quantity with − / + buttons and the keyboard (CU-09 step 3); never below 1 with the buttons. */
export function QuantityField({ label, value, onChange, error }: QuantityFieldProps) {
  const id = useId();
  const step = (delta: number) => {
    onChange(String(Math.max(1, (parseQuantity(value) ?? 0) + delta)));
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <div className={styles.stepper}>
        <button
          type="button"
          aria-label={INVENTORY_MESSAGES.less}
          onClick={() => {
            step(-1);
          }}
        >
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        <button
          type="button"
          aria-label={INVENTORY_MESSAGES.more}
          onClick={() => {
            step(1);
          }}
        >
          +
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
