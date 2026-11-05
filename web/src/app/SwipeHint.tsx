import { useState } from 'react';

import { Button } from '@/shared/ui/Button';

import { APP_MESSAGES } from './messages.es';
import styles from './SwipeHint.module.css';

const STORAGE_KEY = 'swipe-hint-seen';
const PHONE_QUERY = '(max-width: 899px)';

function shouldShowHint(): boolean {
  try {
    return window.matchMedia(PHONE_QUERY).matches && localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

/** First-time hint on phones that sections change by swiping (RF-UX-13). */
export function SwipeHint() {
  const [isVisible, setIsVisible] = useState(shouldShowHint);
  if (!isVisible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode: the hint simply shows again next time.
    }
    setIsVisible(false);
  }

  return (
    <div className={styles.hint} role="status">
      <p className={styles.title}>{APP_MESSAGES.swipeHintTitle}</p>
      <p className={styles.body}>{APP_MESSAGES.swipeHintBody}</p>
      <Button variant="gold" onClick={dismiss}>
        {APP_MESSAGES.swipeHintDismiss}
      </Button>
    </div>
  );
}
