export function notificationDeliveryLabel(status: string): string {
  return (
    (
      {
        QUEUED: 'En cola',
        SENDING: 'Solicitud en curso',
        ACCEPTED: 'Aceptada por el proveedor; entrega pendiente',
        SENT: 'Enviada por el proveedor; entrega pendiente',
        DELIVERED: 'Entregada',
        READ: 'Leída',
        FAILED: 'Falló; requiere revisión',
        UNKNOWN: 'Resultado incierto; no se reenvía automáticamente',
        BLOCKED: 'Bloqueada; requiere revisión',
      } as Record<string, string>
    )[status] ?? 'Estado sin confirmar'
  );
}
