import { initialOf, useCurrentProfile } from '@/features/session';

import styles from './Header.module.css';
import { APP_MESSAGES } from './messages.es';

interface HeaderProps {
  sectionLabel: string;
  onOpenProfile: () => void;
}

/**
 * Business name from the database (D-19), its initial as the logo, the
 * current section, and the user's initial to open Perfil.
 */
export function Header({ sectionLabel, onOpenProfile }: HeaderProps) {
  const { business, fullName } = useCurrentProfile();

  return (
    <header className={styles.header}>
      <div className={styles.logo} aria-hidden="true">
        {initialOf(business.name)}
      </div>
      <div className={styles.titles}>
        <h1 className={styles.businessName}>{business.name}</h1>
        <p className={styles.section}>{sectionLabel}</p>
      </div>
      <button
        type="button"
        className={styles.avatar}
        aria-label={APP_MESSAGES.openProfile}
        onClick={onOpenProfile}
      >
        {initialOf(fullName)}
      </button>
    </header>
  );
}
