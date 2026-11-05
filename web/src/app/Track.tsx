import { useEffect, useLayoutEffect, useRef } from 'react';

import type { Section } from './sections';
import styles from './Track.module.css';

/** Wait this long after the last scroll event before reading the snapped panel. */
const SCROLL_SETTLE_MS = 80;

interface TrackProps {
  activeIndex: number;
  sections: readonly Section[];
  /** Called when a swipe settles on another panel. */
  onSwipe: (index: number) => void;
}

/**
 * The six sections side by side with CSS scroll-snap (RF-UX-02). The route is
 * the source of truth: when it changes, the Track scrolls to it; when a swipe
 * settles on another panel, the Track reports it so the route can follow.
 */
export function Track({ activeIndex, sections, onSwipe }: TrackProps) {
  const trackRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const hasScrolledRef = useRef(false);

  // Route → scroll. The first positioning is instant; later ones animate.
  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
    const track = trackRef.current;
    if (!track) return;
    const left = activeIndex * track.clientWidth;
    if (Math.abs(track.scrollLeft - left) > 1) {
      track.scrollTo({ left, behavior: hasScrolledRef.current ? 'smooth' : 'instant' });
    }
    hasScrolledRef.current = true;
  }, [activeIndex]);

  // Swipe → route, once scrolling settles; and re-snap instantly on resize.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    function onScroll() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (!track) return;
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== activeIndexRef.current) onSwipe(index);
      }, SCROLL_SETTLE_MS);
    }

    // Keep the active panel snapped when the Track changes size (rotation, breakpoint).
    const observer = new ResizeObserver(() => {
      track.scrollTo({ left: activeIndexRef.current * track.clientWidth, behavior: 'instant' });
    });

    track.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(track);
    return () => {
      clearTimeout(settleTimer);
      track.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [onSwipe]);

  return (
    <main ref={trackRef} className={styles.track}>
      {sections.map(({ id, label, Component }, index) => (
        <section
          key={id}
          className={styles.panel}
          aria-label={label}
          // Off-screen panels stay rendered for the swipe, but out of focus and screen readers.
          inert={index !== activeIndex}
        >
          <div className={styles.inner}>
            <Component />
          </div>
        </section>
      ))}
    </main>
  );
}
