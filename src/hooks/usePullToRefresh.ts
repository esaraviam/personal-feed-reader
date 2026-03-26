import { useEffect, useRef, useState } from 'react';

interface Options {
  onRefresh: () => Promise<void>;
  /** Distance in px the user must pull before release triggers a refresh. Default: 72. */
  threshold?: number;
  /** Whether to enable the hook. Useful to disable when view is hidden. Default: true. */
  enabled?: boolean;
}

interface PullState {
  /** 0–1 progress toward threshold, used to animate the indicator. */
  pullProgress: number;
  /** True while the async refresh is in flight. */
  refreshing: boolean;
}

/**
 * Adds pull-to-refresh behaviour to a scroll container.
 *
 * Attach `scrollRef` to the scrollable element. The hook returns
 * `{ pullProgress, refreshing }` for rendering a spinner/indicator.
 *
 * - Uses passive touch listeners (no main-thread blocking).
 * - Only fires when the element is scrolled to top.
 * - Does NOT call preventDefault() — preserves iOS native overscroll bounce.
 * - Ignores multi-touch.
 */
export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement | null>,
  { onRefresh, threshold = 72, enabled = true }: Options,
): PullState {
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Mutable refs so event listeners always read the latest values without
  // needing to re-attach on every render.
  const startY = useRef<number | null>(null);
  const pullProgressRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      if (el!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      if (refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        startY.current = null;
        pullProgressRef.current = 0;
        setPullProgress(0);
        return;
      }
      const progress = Math.min(dy / threshold, 1);
      pullProgressRef.current = progress;
      setPullProgress(progress);
    }

    function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      const progress = pullProgressRef.current;
      pullProgressRef.current = 0;
      setPullProgress(0);

      if (progress >= 1 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        void onRefreshRef.current().finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        });
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, threshold, scrollRef]);

  return { pullProgress, refreshing };
}
