import { describe, expect, it } from 'vitest';
import { orderStatuses } from '@/domain/order-state';
import { orderStatusLabel } from '@/lib/order-status-label';
import { notificationErrorLabel } from '@/lib/notification-status';

describe('Spanish order and notification labels', () => {
  it('covers every supported order state without exposing internal values', () => {
    expect(orderStatuses.map(orderStatusLabel)).toEqual([
      'Pedido recibido',
      'Pedido confirmado',
      'En preparación',
      'Listo para entregar',
      'En camino',
      'Completado',
      'Cancelado',
    ]);
  });

  it('explains consent, delivery and uncertain outcomes without claiming success', () => {
    expect(notificationErrorLabel('CONSENT_REQUIRED')).toContain(
      'autorización',
    );
    expect(notificationErrorLabel('RECIPIENT_OPTED_OUT')).toContain(
      'no recibir',
    );
    expect(notificationErrorLabel('DELIVERY_FAILED')).toContain(
      'No se pudo entregar',
    );
    expect(notificationErrorLabel('SEND_OUTCOME_UNKNOWN')).toContain(
      'No se pudo confirmar',
    );
    expect(notificationErrorLabel('PROVIDER_TIMEOUT')).toContain(
      'No se pudo confirmar',
    );
    expect(notificationErrorLabel('PAYLOAD_UNREPRESENTABLE')).toContain(
      'plantilla aprobada',
    );
    expect(notificationErrorLabel('RETRY_LIMIT')).toContain(
      'límite de intentos',
    );
  });

  it('uses safe Spanish fallbacks for unknown values, including object property names', () => {
    for (const value of ['NEW_PROVIDER_ERROR', 'constructor', '__proto__']) {
      expect(notificationErrorLabel(value)).toBe(
        'No se pudo completar el envío; requiere revisión.',
      );
      expect(orderStatusLabel(value)).toBe('Estado por confirmar');
    }
  });
});
