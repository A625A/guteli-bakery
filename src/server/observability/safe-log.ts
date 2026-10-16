/** Fixed vocabulary only: never pass error objects, URLs, IDs or caller text to a sink. */
export const operationalEvents = [
  'ORDER_SAVE_FAILED',
  'REQUEST_FAILED',
  'DATABASE_UNAVAILABLE',
  'AUTH_FAILURE',
  'WHATSAPP_WORKER_FAILED',
  'WHATSAPP_BATCH_COMPLETE',
  'STORAGE_UNAVAILABLE',
  'MONITOR_UNAVAILABLE',
  'RETENTION_DISABLED',
] as const;
export type OperationalEvent = (typeof operationalEvents)[number];
type Signal = { event: OperationalEvent; count: number; lastAt: string };
const state = globalThis as typeof globalThis & {
  guteliSafeSignals?: Map<OperationalEvent, Signal>;
};
const signals = (state.guteliSafeSignals ??= new Map<
  OperationalEvent,
  Signal
>());

export function logOperationalEvent(event: unknown, discarded?: unknown): void {
  void discarded;
  const safe: OperationalEvent =
    typeof event === 'string' &&
    (operationalEvents as readonly string[]).includes(event)
      ? (event as OperationalEvent)
      : 'REQUEST_FAILED';
  const at = new Date().toISOString();
  const count = Math.min(
    Number.MAX_SAFE_INTEGER,
    (signals.get(safe)?.count ?? 0) + 1,
  );
  signals.set(safe, { event: safe, count, lastAt: at });
  try {
    console.warn(JSON.stringify({ event: safe, at }));
  } catch {
    /* Logging never interrupts an order. */
  }
}

/** Process-local observations; absence of failures does not prove uptime. */
export function operationalSnapshot(): readonly Signal[] {
  return [...signals.values()].map((value) => ({ ...value }));
}

/** Better Auth may include SQL, tokens or provider bodies in its arguments. Discard all. */
export function safeAuthLog(level: string, ...discarded: unknown[]) {
  void discarded;
  if (level === 'error' || level === 'warn')
    logOperationalEvent('AUTH_FAILURE');
}
