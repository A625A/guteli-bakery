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

const errorLabels: Readonly<Record<string, string>> = {
  NOT_CONFIGURED: 'El envío automático no está configurado.',
  OUTSIDE_AUTHORIZED_WINDOW:
    'El pedido está fuera del período autorizado para enviar mensajes.',
  RETRY_LIMIT: 'Se alcanzó el límite de intentos; requiere revisión.',
  INVALID_ORDER: 'No se pudo identificar el pedido.',
  ORDER_INELIGIBLE:
    'El pedido ya no reúne las condiciones para enviar esta notificación.',
  CONSENT_REQUIRED:
    'Falta la autorización del destinatario para recibir mensajes.',
  RECIPIENT_OPTED_OUT: 'El destinatario pidió no recibir más mensajes.',
  PAYLOAD_UNREPRESENTABLE:
    'El resumen no cabe o no cumple el formato de la plantilla aprobada.',
  DELIVERY_FAILED: 'No se pudo entregar el mensaje.',
  SEND_OUTCOME_UNKNOWN:
    'No se pudo confirmar si el proveedor aceptó el mensaje; requiere revisión.',
  PROVIDER_TIMEOUT:
    'El proveedor no respondió a tiempo. No se pudo confirmar el envío.',
  PROVIDER_NETWORK_ERROR:
    'Hubo un problema de conexión. No se pudo confirmar el envío.',
  PROVIDER_INVALID_RESPONSE:
    'La respuesta del proveedor no permite confirmar el envío.',
  PROVIDER_UNAVAILABLE:
    'El proveedor tuvo un problema. No se pudo confirmar el envío.',
  PROVIDER_RATE_LIMITED:
    'El proveedor limitó los envíos; se reintentará si quedan intentos disponibles.',
  PROVIDER_REDIRECT_BLOCKED:
    'Se bloqueó una redirección del proveedor por seguridad.',
  PROVIDER_REQUEST_REJECTED: 'El proveedor rechazó la solicitud de envío.',
};

export function notificationErrorLabel(code: string): string {
  return Object.hasOwn(errorLabels, code)
    ? errorLabels[code]
    : 'No se pudo completar el envío; requiere revisión.';
}
