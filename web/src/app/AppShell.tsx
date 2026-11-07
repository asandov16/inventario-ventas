import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { cx } from '@/shared/ui/cx';

import styles from './AppShell.module.css';
import { Header } from './Header';
import { APP_MESSAGES } from './messages.es';
import { SECTIONS, sectionIndexForPath } from './sections';
import { OfflineBanner } from './StatusBanners';
import { SwipeHint } from './SwipeHint';
import { TabBar } from './TabBar';
import { Track } from './Track';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
  );
}

function isModalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Header + swipeable Track of the six sections + TabBar (RF-UX-01 to 04). */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = sectionIndexForPath(location.pathname);
  const activeSection = SECTIONS[activeIndex] ?? SECTIONS[0];

  // Changing section replaces the history entry: "back" closes sheets or
  // leaves the app instead of walking through every section visited.
  const goTo = useCallback(
    (index: number) => {
      const target = SECTIONS[Math.max(0, Math.min(SECTIONS.length - 1, index))];
      if (target && target.path !== location.pathname) {
        void navigate(target.path, { replace: true });
      }
    },
    [location.pathname, navigate],
  );

  // Desktop: arrow keys move between sections, except while typing or in a sheet/dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isTypingTarget(event.target) || isModalOpen()) return;
      if (event.key === 'ArrowRight') goTo(activeIndex + 1);
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, goTo]);

  return (
    <div className={styles.app}>
      <Header
        sectionLabel={activeSection?.label ?? ''}
        onOpenProfile={() => {
          goTo(SECTIONS.findIndex((section) => section.id === 'profile'));
        }}
      />
      <OfflineBanner />
      <Track activeIndex={activeIndex} sections={SECTIONS} onSwipe={goTo} />
      <TabBar activeIndex={activeIndex} sections={SECTIONS} onSelect={goTo} />
      <SwipeHint />
      <button
        type="button"
        className={cx(styles.navButton, styles.navPrevious)}
        aria-label={APP_MESSAGES.previousSection}
        disabled={activeIndex === 0}
        onClick={() => {
          goTo(activeIndex - 1);
        }}
      >
        ‹
      </button>
      <button
        type="button"
        className={cx(styles.navButton, styles.navNext)}
        aria-label={APP_MESSAGES.nextSection}
        disabled={activeIndex === SECTIONS.length - 1}
        onClick={() => {
          goTo(activeIndex + 1);
        }}
      >
        ›
      </button>
    </div>
  );
}
