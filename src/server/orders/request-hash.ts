import { createHash } from 'node:crypto';

import { normalizeOrderText } from '@/domain/order-contract';
import type { CreateOrderRequest } from '@/domain/order-contract';

function compareProductIds(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function canonicalizeCreateOrderRequest(request: CreateOrderRequest) {
  return JSON.stringify({
    ...(request.whatsappOptIn ? { whatsappOptIn: true } : {}),
    ...(request.deliveryPoint
      ? {
          deliveryPoint: {
            lng: request.deliveryPoint.lng,
            lat: request.deliveryPoint.lat,
          },
          deliveryConfirmed: request.deliveryConfirmed,
        }
      : {}),
    ...(request.deliveryQuote ? { deliveryQuote: request.deliveryQuote } : {}),
    customerName: normalizeOrderText(request.customerName),
    phone: normalizeOrderText(request.phone),
    fulfillment: request.fulfillment,
    paymentMethod: request.paymentMethod,
    requestedDate: request.requestedDate,
    deliveryLocation: request.deliveryLocation
      ? normalizeOrderText(request.deliveryLocation)
      : null,
    notes: request.notes ? normalizeOrderText(request.notes) : null,
    items: [...request.items]
      .sort((left, right) => compareProductIds(left.productId, right.productId))
      .map(({ productId, quantity }) => ({ productId, quantity })),
  });
}

export function hashCreateOrderRequest(request: CreateOrderRequest) {
  return createHash('sha256')
    .update(canonicalizeCreateOrderRequest(request))
    .digest('hex');
}
