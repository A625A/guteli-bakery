'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

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

  const onVisibility = () => {
    if (visibilitySource.visibilityState === 'visible') refresh();
    synchronize();
  };
  visibilitySource.addEventListener('visibilitychange', onVisibility);
  synchronize();
  return () => {
    stop();
    visibilitySource.removeEventListener('visibilitychange', onVisibility);
  };
}

export function DashboardRefresh({ refreshedAt }: { refreshedAt: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.parse(refreshedAt));
  const [attempt, setAttempt] = useState<{ source: string; at: number } | null>(
    null,
  );
  const refresh = useCallback(() => {
    setAttempt({ source: refreshedAt, at: Date.now() });
    startTransition(() => router.refresh());
  }, [router, refreshedAt]);
  useEffect(() => installDashboardRefresh(refresh), [refresh]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const waiting = attempt?.source === refreshedAt;
  const unconfirmed = waiting && now - attempt.at >= 10000;
  const stale = now - Date.parse(refreshedAt) >= 65000;
  const updatedLabel = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Guatemala',
  })
    .format(new Date(refreshedAt))
    .replace(/\s+/g, ' ');
  return (
    <section aria-label="Actualización del panel">
      <p>
        Última consulta correcta:{' '}
        <time dateTime={refreshedAt}>{updatedLabel}</time> (Guatemala).
      </p>
      <p role="status">
        {stale || unconfirmed
          ? 'No se ha confirmado una actualización reciente. Revisa tu conexión y vuelve a actualizar.'
          : waiting
            ? 'Actualizando el panel…'
            : 'La información se consulta cada 30 segundos mientras el panel está visible.'}
      </p>
      <button
        type="button"
        onClick={refresh}
        disabled={waiting && !unconfirmed}
      >
        Actualizar panel
      </button>
      <p>
        Con el panel cerrado no recibirás alertas. Los envíos automáticos siguen
        desactivados.
      </p>
    </section>
  );
}
