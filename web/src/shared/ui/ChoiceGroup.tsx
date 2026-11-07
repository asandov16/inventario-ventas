import { useId } from 'react';

import styles from './ChoiceGroup.module.css';
import { cx } from './cx';

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  /** Short note next to the label, e.g. "obligatorio en toda venta". */
  labelHint?: string;
  choices: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/** Big tappable options that behave as radio buttons (prototype `.opts`). */
export function ChoiceGroup<T extends string>({
  label,
  labelHint,
  choices,
  value,
  onChange,
}: ChoiceGroupProps<T>) {
  const labelId = useId();
  return (
    <div className={styles.group}>
      <p id={labelId} className={styles.label}>
        {label}
        {labelHint && <span className={styles.labelHint}> · {labelHint}</span>}
      </p>
      <div className={styles.options} role="radiogroup" aria-labelledby={labelId}>
        {choices.map((choice) => {
          const isSelected = choice.value === value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={cx(styles.option, isSelected && styles.selected)}
              onClick={() => {
                onChange(choice.value);
              }}
            >
              {choice.label}
              {choice.hint && <small className={styles.hint}>{choice.hint}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
