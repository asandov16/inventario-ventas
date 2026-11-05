import { Button } from '@/shared/ui/Button';

import { useSignOut } from '../hooks/useSignOut';
import { SESSION_MESSAGES } from '../messages.es';
import styles from './SessionScreens.module.css';

/** Signed in, but the user is inactive or has no profile in any business. */
export function BlockedScreen({ reason }: { reason: 'inactive' | 'no_profile' }) {
  const signOut = useSignOut();
  const isInactive = reason === 'inactive';

  return (
    <main className={styles.screen}>
      <div className={styles.card} role="alert">
        <h1 className={styles.title}>
          {isInactive ? SESSION_MESSAGES.inactiveTitle : SESSION_MESSAGES.noProfileTitle}
        </h1>
        <p className={styles.subtitle}>
          {isInactive ? SESSION_MESSAGES.inactiveBody : SESSION_MESSAGES.noProfileBody}
        </p>
        <Button variant="light" block onClick={() => void signOut()}>
          {SESSION_MESSAGES.signOut}
        </Button>
      </div>
    </main>
  );
}
