import { useLayoutEffect, useRef, useState } from 'react';

import { cx } from '@/shared/ui/cx';

import { APP_MESSAGES } from './messages.es';
import type { Section, SectionId } from './sections';
import styles from './TabBar.module.css';

interface TabBarProps {
  activeIndex: number;
  sections: readonly Section[];
  onSelect: (index: number) => void;
  /** Red counters (RF-UX-04): overdue sales, low stock. Zero or missing hides the dot. */
  badges?: Partial<Record<SectionId, number>>;
}

interface IndicatorBox {
  left: number;
  width: number;
  /** False for the first placement, so the bar does not slide in from the left edge. */
  animate: boolean;
}

/** Bottom bar on phones, top bar from 900 px, with an animated indicator (RF-UX-01, 03, 04). */
export function TabBar({ activeIndex, sections, onSelect, badges = {} }: TabBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<IndicatorBox>({ left: 0, width: 0, animate: false });

  // Measure the active tab now and whenever the bar changes size (rotation,
  // breakpoint, fonts loading), not only on window resize.
  useLayoutEffect(() => {
    function measure() {
      const tab = tabRefs.current[activeIndex];
      if (!tab) return;
      setIndicator((previous) => ({
        left: tab.offsetLeft,
        width: tab.offsetWidth,
        animate: previous.width > 0,
      }));
    }
    measure();
    const nav = navRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => {
      observer.disconnect();
    };
  }, [activeIndex]);

  return (
    <nav ref={navRef} className={styles.tabs} aria-label={APP_MESSAGES.sectionsNavLabel}>
      <span
        className={cx(styles.indicator, indicator.animate && styles.indicatorAnimated)}
        aria-hidden="true"
        style={{ width: indicator.width, transform: `translateX(${String(indicator.left)}px)` }}
      />
      {sections.map((section, index) => {
        const badge = badges[section.id] ?? 0;
        const isActive = index === activeIndex;
        return (
          <button
            key={section.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            className={cx(styles.tab, isActive && styles.active)}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onSelect(index);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {section.icon}
            </svg>
            <span>{section.label}</span>
            {badge > 0 && (
              <b className={styles.badge} aria-label={APP_MESSAGES.pendingCount(badge)}>
                {badge}
              </b>
            )}
          </button>
        );
      })}
    </nav>
  );
}
