import { cx } from './cx';
import styles from './Segmented.module.css';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Two or three views of the same section (prototype v2 .seg): "Inventario actual | Agregar stock". */
export function Segmented<T extends string>({
  label,
  segments,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className={styles.seg} role="tablist" aria-label={label}>
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          role="tab"
          aria-selected={segment.value === value}
          className={cx(styles.segment, segment.value === value && styles.selected)}
          onClick={() => {
            onChange(segment.value);
          }}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
