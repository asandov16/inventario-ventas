import styles from './App.module.css';
import { APP_MESSAGES } from './messages.es';

/**
 * Stage 0 placeholder shell. Stage 2 replaces it with the router, the
 * swipeable six-section Track, the TabBar and the AuthGate.
 */
export function App() {
  return (
    <main className={styles.shell}>
      <h1 className={styles.title}>
        {import.meta.env.VITE_APP_NAME ?? APP_MESSAGES.defaultAppName}
      </h1>
      <p className={styles.subtitle}>{APP_MESSAGES.underConstruction}</p>
    </main>
  );
}
