'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Refreshes on foreground, every 30s and at server-reported price boundaries. */
export function useLiveResource<T>(
  initial: T,
  read: () => Promise<T>,
  delay: (value: T) => number,
) {
  const [data, setData] = useState(initial);
  const [available, setAvailable] = useState(true);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let pending: Promise<void> | null = null;
    function refresh() {
      if (pending) return pending;
      clearTimeout(timer);
      setAvailable(false);
      const started = performance.now();
      pending = read()
        .then((value) => {
          if (!active) return;
          setData(value);
          setAvailable(true);
          timer = setTimeout(
            refresh,
            Math.max(
              100,
              Math.min(30000, delay(value) - (performance.now() - started)),
            ),
          );
        })
        .catch(() => {
          if (active) {
            setAvailable(false);
            timer = setTimeout(refresh, 5000);
          }
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    }
    refreshRef.current = refresh;
    const foreground = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    window.addEventListener('focus', foreground);
    document.addEventListener('visibilitychange', foreground);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('focus', foreground);
      document.removeEventListener('visibilitychange', foreground);
    };
  }, [read, delay]);
  const refresh = useCallback(() => refreshRef.current(), []);
  return { data, available, refresh };
}
