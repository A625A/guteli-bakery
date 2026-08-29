import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrderRequestSchema } from '@/domain/order-contract';
import { publicOrderErrorCodes } from '@/server/orders/errors';
import {
  canonicalizeCreateOrderRequest,
  hashCreateOrderRequest,
} from '@/server/orders/request-hash';

const productId = '00000000-0000-4000-8000-000000000001';
const secondProductId = '00000000-0000-4000-8000-000000000002';

function validRequest() {
  return {
    customerName: 'Ana López',
    phone: '+502 5555-5555',
    fulfillment: 'pickup' as const,
    requestedDate: '2026-08-31',
    items: [{ productId, quantity: 2 }],
  };
}

describe('createOrderRequestSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts the exact flat request shape and rejects browser-owned fields', () => {
    expect(createOrderRequestSchema.safeParse(validRequest()).success).toBe(
      true,
    );

    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        subtotalMinor: 1,
      }).success,
    ).toBe(false);
  });

  it('enforces field and item boundaries', () => {
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        customerName: 'a'.repeat(101),
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        notes: 'a'.repeat(501),
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        items: [{ productId, quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        items: [{ productId, quantity: 100 }],
      }).success,
    ).toBe(false);
  });

  it('allows only approved phone formatting with 8 through 15 digits', () => {
    for (const phone of ['5555 5555', '+502 (555) 555-555']) {
      expect(
        createOrderRequestSchema.safeParse({ ...validRequest(), phone })
          .success,
      ).toBe(true);
    }

    for (const phone of ['1234567', '1234567890123456', '5555-ABCD']) {
      expect(
        createOrderRequestSchema.safeParse({ ...validRequest(), phone })
          .success,
      ).toBe(false);
    }
  });

  it('rejects invalid calendar dates and a date before Guatemala local advance time', () => {
    vi.setSystemTime(new Date('2026-08-29T05:30:00.000Z'));

    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        requestedDate: '2026-08-29',
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        requestedDate: '2026-08-30',
      }).success,
    ).toBe(true);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        requestedDate: '2026-02-30',
      }).success,
    ).toBe(false);
  });

  it('requires a meaningful delivery location and rejects unsafe controls', () => {
    for (const deliveryLocation of [undefined, ' \t\n ', '\u00a0']) {
      expect(
        createOrderRequestSchema.safeParse({
          ...validRequest(),
          fulfillment: 'delivery',
          deliveryLocation,
        }).success,
      ).toBe(false);
    }

    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        fulfillment: 'delivery',
        deliveryLocation: 'Zona 10\nApartamento 2',
        notes: 'Tocar el timbre\npor favor',
      }).success,
    ).toBe(true);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        customerName: 'Ana\nLópez',
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        notes: 'Tocar\u0007 el timbre',
      }).success,
    ).toBe(false);
  });

  it('rejects every pickup delivery location at the deliveryLocation path', () => {
    for (const deliveryLocation of [undefined, '', 'Zona 10']) {
      const result = createOrderRequestSchema.safeParse({
        ...validRequest(),
        deliveryLocation,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['deliveryLocation'] }),
          ]),
        );
      }
    }
  });

  it('rejects duplicate product IDs and malformed product IDs', () => {
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        items: [
          { productId, quantity: 1 },
          { productId, quantity: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      createOrderRequestSchema.safeParse({
        ...validRequest(),
        items: [{ productId: 'not-a-uuid', quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it('normalizes product UUIDs before duplicate detection', () => {
    const uppercaseProductId = productId.toUpperCase();
    const parsed = createOrderRequestSchema.parse({
      ...validRequest(),
      items: [{ productId: uppercaseProductId, quantity: 1 }],
    });
    const duplicate = createOrderRequestSchema.safeParse({
      ...validRequest(),
      items: [
        { productId, quantity: 1 },
        { productId: uppercaseProductId, quantity: 1 },
      ],
    });

    expect(parsed.items[0].productId).toBe(productId);
    expect(duplicate.success).toBe(false);
    if (!duplicate.success) {
      expect(duplicate.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['items', 1, 'productId'] }),
        ]),
      );
    }
  });
});

describe('canonical order request hashing', () => {
  it('is stable across harmless normalization, property order, and item order', () => {
    const first = createOrderRequestSchema.parse({
      ...validRequest(),
      customerName: '  Ana López  ',
      notes: 'Tocar\r\nel timbre',
      items: [
        { productId: secondProductId, quantity: 1 },
        { productId, quantity: 2 },
      ],
    });
    const second = createOrderRequestSchema.parse({
      items: [
        { quantity: 2, productId },
        { quantity: 1, productId: secondProductId },
      ],
      notes: 'Tocar\nel timbre',
      requestedDate: '2026-08-31',
      fulfillment: 'pickup',
      phone: '+502 5555-5555',
      customerName: 'Ana López',
    });

    expect(hashCreateOrderRequest(first)).toBe(hashCreateOrderRequest(second));
  });

  it('changes when validated request meaning changes', () => {
    const original = createOrderRequestSchema.parse(validRequest());
    const changed = createOrderRequestSchema.parse({
      ...validRequest(),
      items: [{ productId, quantity: 3 }],
    });

    expect(hashCreateOrderRequest(original)).not.toBe(
      hashCreateOrderRequest(changed),
    );
  });

  it('sorts normalized UUIDs by code unit without host locale collation', () => {
    const request = createOrderRequestSchema.parse({
      ...validRequest(),
      items: [
        { productId: secondProductId, quantity: 1 },
        { productId, quantity: 2 },
      ],
    });
    vi.spyOn(String.prototype, 'localeCompare').mockReturnValue(-1);

    expect(canonicalizeCreateOrderRequest(request)).toBe(
      `{"customerName":"Ana López","phone":"+502 5555-5555","fulfillment":"pickup","requestedDate":"2026-08-31","deliveryLocation":null,"notes":null,"items":[{"productId":"${productId}","quantity":2},{"productId":"${secondProductId}","quantity":1}]}`,
    );
  });
});

describe('public order error contract', () => {
  it('exposes only the stable public order codes', () => {
    expect(publicOrderErrorCodes).toEqual([
      'VALIDATION_ERROR',
      'IDEMPOTENCY_CONFLICT',
      'RATE_LIMITED',
      'PRODUCT_UNAVAILABLE',
      'PRODUCT_OUT_OF_STOCK',
      'INTERNAL_ERROR',
    ]);
  });
});
