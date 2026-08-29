import { describe, expect, it } from 'vitest';

import { getCartLines } from '@/domain/cart';
import { validateOrder } from '@/domain/order';
import { getMinimumOrderDate } from '@/lib/date';
import { buildOrderSummary } from '@/lib/order-summary';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const orderProducts = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'pretzel-original',
    name: 'Originales',
    category: {
      id: '00000000-0000-4000-8000-000000000101',
      slug: 'pretzels',
      name: 'Pretzels',
    },
    priceMinor: 6000,
    saleUnit: 'Bolsa de 5',
    stockAvailable: true,
    imageUrl: '/images/products/pretzel-original.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    slug: 'bagel-original',
    name: 'Originales',
    category: {
      id: '00000000-0000-4000-8000-000000000102',
      slug: 'bagels',
      name: 'Bagels',
    },
    priceMinor: 6000,
    saleUnit: null,
    stockAvailable: true,
    imageUrl: '/images/products/bagel-original.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    slug: 'nuditos',
    name: 'Nuditos',
    category: {
      id: '00000000-0000-4000-8000-000000000104',
      slug: 'nuditos',
      name: 'Nuditos',
    },
    priceMinor: 6000,
    saleUnit: 'Bolsa de 15',
    stockAvailable: true,
    imageUrl: null,
  },
] as const;

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

  it('rejects blank contact fields and malformed calendar dates', () => {
    expect(
      validateOrder(
        {
          name: '  ',
          phone: '',
          fulfillment: 'pickup',
          requestedDate: '2026-02-30',
          location: '',
          notes: '',
        },
        '2026-07-23',
      ),
    ).toEqual({
      name: 'Ingresa tu nombre.',
      phone: 'Ingresa tu teléfono.',
      requestedDate: 'Selecciona una fecha válida.',
    });
  });

  it('rejects oversized fields, control characters, and malformed phones', () => {
    const validOrder = {
      name: 'Ana',
      phone: '5555 5555',
      fulfillment: 'delivery' as const,
      requestedDate: '2026-07-23',
      location: 'Zona 10',
      notes: '',
    };

    expect(
      validateOrder(
        {
          ...validOrder,
          name: `Ana${'a'.repeat(98)}`,
          phone: '5555-ABCD',
          location: 'a'.repeat(301),
          notes: 'a'.repeat(501),
        },
        '2026-07-23',
      ),
    ).toEqual({
      name: 'Usa un nombre de hasta 100 caracteres.',
      phone: 'Ingresa un teléfono válido de 8 a 15 dígitos.',
      location: 'Usa una ubicación de hasta 300 caracteres.',
      notes: 'Usa notas de hasta 500 caracteres.',
    });

    expect(
      validateOrder(
        {
          ...validOrder,
          name: 'Ana\nPedido: gratis',
          phone: '1234567',
          location: 'Zona 10\u0000',
          notes: 'Tocar timbre\u0007',
        },
        '2026-07-23',
      ),
    ).toEqual({
      name: 'El nombre contiene caracteres no permitidos.',
      phone: 'Ingresa un teléfono válido de 8 a 15 dígitos.',
      location: 'La ubicación contiene caracteres no permitidos.',
      notes: 'Las notas contienen caracteres no permitidos.',
    });

    expect(
      validateOrder(
        {
          ...validOrder,
          phone: '5555\u20285555',
        },
        '2026-07-23',
      ),
    ).toEqual({
      phone: 'Ingresa un teléfono válido de 8 a 15 dígitos.',
    });
  });

  it('builds a readable encoded user-controlled handoff', () => {
    const lines = getCartLines(
      [{ productId: orderProducts[0].id, quantity: 2 }],
      orderProducts,
    );
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

  it('includes delivery details and safe unknown-quantity copy', () => {
    const lines = getCartLines(
      [
        { productId: orderProducts[1].id, quantity: 2 },
        { productId: orderProducts[2].id, quantity: 1 },
      ],
      orderProducts,
    );
    const summary = buildOrderSummary(lines, {
      name: 'Ana',
      phone: '5555 5555',
      fulfillment: 'delivery',
      requestedDate: '2026-07-23',
      location: 'Zona 10',
      notes: '',
    });

    expect(summary).toContain('Modalidad: Entrega');
    expect(summary).toContain('Ubicación de entrega: Zona 10');
    expect(summary).toContain('Presentación: Cantidad por confirmar');
    expect(summary).toContain('Total de línea: Q120');
    expect(summary).toContain('Subtotal estimado: Q180');
  });

  it('normalizes whitespace before placing personal data in the handoff', () => {
    const lines = getCartLines(
      [{ productId: orderProducts[0].id, quantity: 1 }],
      orderProducts,
    );
    const summary = buildOrderSummary(lines, {
      name: '  Ana   López  ',
      phone: '5555\t5555',
      fulfillment: 'delivery',
      requestedDate: '2026-07-23',
      location: 'Zona 10\nApartamento 2',
      notes: 'Tocar\r\nel timbre',
    });

    expect(summary).toContain('Nombre: Ana López');
    expect(summary).toContain('Teléfono: 5555 5555');
    expect(summary).toContain('Ubicación de entrega: Zona 10 Apartamento 2');
    expect(summary).toContain('Notas: Tocar el timbre');
    expect(summary).not.toContain('\t');
    expect(summary).not.toContain('\r');
  });
});
