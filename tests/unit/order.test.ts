import { describe, expect, it } from 'vitest';

import { getCartLines } from '@/domain/cart';
import { validateOrder } from '@/domain/order';
import { getMinimumOrderDate } from '@/lib/date';
import { buildOrderSummary } from '@/lib/order-summary';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

describe('order request', () => {
  it('uses the Guatemala calendar before adding two days', () => {
    expect(getMinimumOrderDate(new Date('2026-07-21T05:30:00.000Z'), 2)).toBe(
      '2026-07-22',
    );
    expect(getMinimumOrderDate(new Date('2026-07-21T06:30:00.000Z'), 2)).toBe(
      '2026-07-23',
    );
  });

  it('requires location only for delivery and rejects early dates', () => {
    expect(
      validateOrder(
        {
          name: 'Ana',
          phone: '5555 5555',
          fulfillment: 'delivery',
          requestedDate: '2026-07-22',
          location: '',
          notes: '',
        },
        '2026-07-23',
      ),
    ).toMatchObject({
      requestedDate: expect.any(String),
      location: expect.any(String),
    });
    expect(
      validateOrder(
        {
          name: 'Ana',
          phone: '5555 5555',
          fulfillment: 'pickup',
          requestedDate: '2026-07-23',
          location: '',
          notes: '',
        },
        '2026-07-23',
      ),
    ).toEqual({});
  });

  it('builds a readable encoded user-controlled handoff', () => {
    const lines = getCartLines([
      { productId: 'pretzel-original', quantity: 2 },
    ]);
    const summary = buildOrderSummary(lines, {
      name: 'Ana',
      phone: '5555 5555',
      fulfillment: 'pickup',
      requestedDate: '2026-07-23',
      location: '',
      notes: 'Sin picante',
    });
    expect(summary).toContain('2 × Pretzels — Originales');
    expect(summary).toContain('Subtotal estimado: Q120');
    expect(summary).toContain(
      'El pedido queda sujeto a confirmación por WhatsApp',
    );
    expect(buildWhatsAppUrl('502 4256-9861', summary)).toBe(
      `https://wa.me/50242569861?text=${encodeURIComponent(summary)}`,
    );
  });
});
