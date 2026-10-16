export type OperationalStatus = {
  key: string;
  label: string;
  state: 'ok' | 'attention' | 'unknown' | 'disabled';
  message: string;
};
export type OperationalFacts = {
  database: boolean;
  storage: boolean | null;
  notifications: { failed: number; unknown: number; overdue: number } | null;
  automationEnabled: boolean;
  worker: { status: string; checkedAt: Date } | null;
  localOrderFailures: number;
  now: Date;
};
export function describeOperations(
  facts: OperationalFacts,
): OperationalStatus[] {
  const workerFresh =
    facts.worker &&
    facts.worker.checkedAt.getTime() <= facts.now.getTime() &&
    facts.now.getTime() - facts.worker.checkedAt.getTime() <= 10 * 60_000;
  return [
    {
      key: 'database',
      label: 'Base de datos',
      state: facts.database ? 'ok' : 'attention',
      message: facts.database
        ? 'La consulta de comprobación respondió.'
        : 'No pudimos comprobar la base de datos. Pide apoyo técnico antes de repetir operaciones.',
    },
    {
      key: 'orders',
      label: 'Registro de pedidos',
      state: facts.localOrderFailures > 0 ? 'attention' : 'unknown',
      message:
        facts.localOrderFailures > 0
          ? 'Se detectaron errores al guardar pedidos en este proceso. Revisa los pedidos antes de pedir que se envíen de nuevo.'
          : 'Sin errores observados en este proceso desde su inicio; esto no comprueba todos los pedidos.',
    },
    {
      key: 'storage',
      label: 'Archivos de productos',
      state:
        facts.storage === null ? 'unknown' : facts.storage ? 'ok' : 'attention',
      message:
        facts.storage === true
          ? 'La carpeta permite lectura y escritura. Falta comprobar espacio, permanencia y restauración de archivos.'
          : 'No pudimos comprobar el acceso a los archivos. Pide apoyo técnico.',
    },
    {
      key: 'notifications',
      label: 'Notificaciones de WhatsApp',
      state: !facts.notifications
        ? 'unknown'
        : facts.notifications.failed + facts.notifications.unknown > 0 ||
            (facts.automationEnabled && facts.notifications.overdue > 0)
          ? 'attention'
          : facts.automationEnabled
            ? 'ok'
            : 'disabled',
      message: !facts.notifications
        ? 'No pudimos consultar el estado de las notificaciones.'
        : facts.notifications.unknown > 0
          ? 'Hay envíos cuyo resultado no está confirmado. No los reenvíes hasta revisarlos.'
          : facts.notifications.failed > 0
            ? 'Hay notificaciones fallidas. Revisa los pedidos y contacta al cliente manualmente si corresponde.'
            : !facts.automationEnabled
              ? 'El envío automático está desactivado. Los mensajes pendientes no se enviarán.'
              : facts.notifications.overdue > 0
                ? 'Hay mensajes pendientes desde hace más de 15 minutos. Pide una revisión.'
                : 'No se detectaron fallas ni atrasos en la cola consultada.',
    },
    {
      key: 'worker',
      label: 'Proceso de notificaciones',
      state: !facts.automationEnabled
        ? 'disabled'
        : !workerFresh || facts.worker?.status !== 'ok'
          ? 'attention'
          : 'ok',
      message: !facts.automationEnabled
        ? 'Desactivado junto con el envío automático.'
        : !workerFresh
          ? 'No hay una ejecución confirmada en los últimos 10 minutos. Pide apoyo técnico.'
          : facts.worker?.status === 'ok'
            ? 'La última ejecución terminó correctamente.'
            : 'La última ejecución registró un problema. Pide apoyo técnico.',
    },
    {
      key: 'payments',
      label: 'Verificación de pagos',
      state: 'disabled',
      message:
        'Pendiente de integrar un proveedor verificado. Este panel no confirma cobros.',
    },
    {
      key: 'backups',
      label: 'Respaldos',
      state: 'unknown',
      message:
        'Pendiente del Ticket 11. Todavía no hay evidencia automática de respaldo o restauración.',
    },
  ];
}
