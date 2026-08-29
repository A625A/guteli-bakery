export const orderStatuses = [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const allowedOrderStateTransitions: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return allowedOrderStateTransitions[from].includes(to);
}
