'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

type VisibilitySource = Pick<
  Document,
  'visibilityState' | 'addEventListener' | 'removeEventListener'
>;

export function installDashboardRefresh(
  refresh: () => void,
  visibilitySource: VisibilitySource = document,
) {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const synchronize = () => {
    stop();
    if (visibilitySource.visibilityState === 'visible') {
      timer = setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    }
  };

  visibilitySource.addEventListener('visibilitychange', synchronize);
  synchronize();
  return () => {
    stop();
    visibilitySource.removeEventListener('visibilitychange', synchronize);
  };
}

export function DashboardRefresh() {
  const router = useRouter();

  useEffect(() => installDashboardRefresh(() => router.refresh()), [router]);

  return null;
}
