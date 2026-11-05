import styles from './Header.module.css';
import { APP_MESSAGES } from './messages.es';

interface HeaderProps {
  sectionLabel: string;
  onOpenProfile: () => void;
}

/**
 * Business name, its initial as the logo, and the current section. The name
 * comes from the build until the session loads it from the database (D-19).
 */
export function Header({ sectionLabel, onOpenProfile }: HeaderProps) {
  const businessName = import.meta.env.VITE_APP_NAME ?? APP_MESSAGES.defaultAppName;
  const initial = businessName.trim().charAt(0).toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.logo} aria-hidden="true">
        {initial}
      </div>
      <div className={styles.titles}>
        <h1 className={styles.businessName}>{businessName}</h1>
        <p className={styles.section}>{sectionLabel}</p>
      </div>
      <button
        type="button"
        className={styles.avatar}
        aria-label={APP_MESSAGES.openProfile}
        onClick={onOpenProfile}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </button>
    </header>
  );
}
