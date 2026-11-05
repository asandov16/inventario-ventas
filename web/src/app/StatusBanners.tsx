import { useRegisterSW } from 'virtual:pwa-register/react';

import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { Button } from '@/shared/ui/Button';

import { APP_MESSAGES } from './messages.es';
import styles from './StatusBanners.module.css';

/**
 * Bar inside the shell while the device has no connection (F3-T10). Selling
 * needs a connection in the beta; the offline queue arrives in Stage 5.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className={styles.offline} role="status">
      <strong>{APP_MESSAGES.offlineTitle}.</strong> {APP_MESSAGES.offlineBody}
    </div>
  );
}

/**
 * Registers the service worker as soon as the app opens (also on the sign-in
 * screen) and offers the new version when one is ready (RF-UX-12).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className={styles.update} role="status">
      <span>
        <strong>{APP_MESSAGES.updateTitle}.</strong> {APP_MESSAGES.updateBody}
      </span>
      <span className={styles.actions}>
        <Button
          variant="light"
          onClick={() => {
            setNeedRefresh(false);
          }}
        >
          {APP_MESSAGES.updateLater}
        </Button>
        <Button
          variant="gold"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          {APP_MESSAGES.updateButton}
        </Button>
      </span>
    </div>
  );
}
