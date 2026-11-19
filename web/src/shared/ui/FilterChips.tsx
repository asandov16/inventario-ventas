import { cx } from './cx';
import styles from './FilterChips.module.css';

export interface FilterChip {
  key: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
}

interface FilterChipsProps {
  label: string;
  chips: readonly FilterChip[];
}

/** Row of toggle chips above a list (prototype v2 .chips); scrolls sideways on a phone. */
export function FilterChips({ label, chips }: FilterChipsProps) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={cx(styles.chip, chip.selected && styles.chipSelected)}
          aria-pressed={chip.selected}
          onClick={chip.onToggle}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
