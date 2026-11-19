import styles from './SearchInput.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

/** Search box of the lists (prototype v2 .search): filters as the person types. */
export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <input
      type="search"
      className={styles.search}
      placeholder={placeholder}
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
