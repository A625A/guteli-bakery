import type { OrderStatus } from '@/domain/order-state';

const labels: Readonly<Record<OrderStatus, string>> = {
  RECEIVED: 'Pedido recibido',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo para entregar',
  OUT_FOR_DELIVERY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export function orderStatusLabel(status: string): string {
  return Object.hasOwn(labels, status)
    ? labels[status as OrderStatus]
    : 'Estado por confirmar';
}
