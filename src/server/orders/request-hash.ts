import { createHash } from 'node:crypto';

import { normalizeOrderText } from '@/domain/order-contract';
import type { CreateOrderRequest } from '@/domain/order-contract';

export function canonicalizeCreateOrderRequest(request: CreateOrderRequest) {
  return JSON.stringify({
    customerName: normalizeOrderText(request.customerName),
    phone: normalizeOrderText(request.phone),
    fulfillment: request.fulfillment,
    requestedDate: request.requestedDate,
    deliveryLocation: request.deliveryLocation
      ? normalizeOrderText(request.deliveryLocation)
      : null,
    notes: request.notes ? normalizeOrderText(request.notes) : null,
    items: [...request.items]
      .sort((left, right) => left.productId.localeCompare(right.productId))
      .map(({ productId, quantity }) => ({ productId, quantity })),
  });
}

export function hashCreateOrderRequest(request: CreateOrderRequest) {
  return createHash('sha256')
    .update(canonicalizeCreateOrderRequest(request))
    .digest('hex');
}
