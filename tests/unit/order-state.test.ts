import { describe, expect, it } from 'vitest';

import { canTransitionOrderStatus, orderStatuses } from '@/domain/order-state';
import type { OrderStatus } from '@/domain/order-state';

const expectedTransitions: Readonly<
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

describe('order state policy', () => {
  it.each(orderStatuses)('allows only approved transitions from %s', (from) => {
    for (const to of orderStatuses) {
      expect(canTransitionOrderStatus(from, to)).toBe(
        expectedTransitions[from].includes(to),
      );
    }
  });
});
