import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildOwnerOrderMessage } from '@/server/notifications/build-owner-message';

const publicAdminBaseUrl = 'https://admin.guteli.test/backoffice/';

describe('buildOwnerOrderMessage', () => {
  it('snapshots a pickup message with the full phone and no location', () => {
    const message = buildOwnerOrderMessage(
      {
        publicId: 'GTL-20260916-A/B 7',
        customerName: 'Ana López',
        phone: '+502 (5555) 0101',
        fulfillment: 'PICKUP',
        deliveryLocation: null,
        requestedDate: '2026-09-20',
        items: [
          { productName: 'Caja de 6 cupcakes', quantity: 2 },
          { productName: 'Pastel de chocolate', quantity: 1 },
        ],
        subtotalMinor: 32550,
        shippingMinor: 0,
        totalMinor: 32550,
        notes: 'Escribir “Feliz día”',
      },
      { publicAdminBaseUrl },
    );

    expect(message).toMatchInlineSnapshot(`
      {
        "adminOrderUrl": "https://admin.guteli.test/backoffice/admin/orders/GTL-20260916-A%2FB%207",
        "bodyText": "Nuevo pedido Guteli
      Pedido: GTL-20260916-A/B 7
      Cliente: Ana López
      Teléfono: +502 (5555) 0101
      Modalidad: Recoger
      Fecha solicitada: 2026-09-20
      Productos:
      - 2 × Caja de 6 cupcakes
      - 1 × Pastel de chocolate
      Subtotal: Q325.50
      Cotización de entrega: No aplica
      Notas: Escribir “Feliz día”
      Administrar: https://admin.guteli.test/backoffice/admin/orders/GTL-20260916-A%2FB%207",
        "publicOrderId": "GTL-20260916-A/B 7",
        "templateContractVersion": "guteli-owner-order-created-v1",
      }
    `);
    expect(message.bodyText).toContain('Teléfono: +502 (5555) 0101');
    expect(message.bodyText).not.toContain('Ubicación de entrega:');
  });

  it('snapshots delivery with the full submitted location and pending quote', () => {
    const message = buildOwnerOrderMessage(
      {
        publicId: 'GTL-20260916-002',
        customerName: 'José Pérez',
        phone: '+502 4111 2233',
        fulfillment: 'DELIVERY',
        deliveryLocation:
          '15 avenida 12-34, zona 10, Edificio Largo, nivel 8, oficina 802',
        requestedDate: '2026-09-22',
        items: [{ productName: 'Tarta de limón grande', quantity: 3 }],
        subtotalMinor: 45000,
        shippingMinor: null,
        totalMinor: null,
        notes: null,
      },
      { publicAdminBaseUrl },
    );

    expect(message).toMatchInlineSnapshot(`
      {
        "adminOrderUrl": "https://admin.guteli.test/backoffice/admin/orders/GTL-20260916-002",
        "bodyText": "Nuevo pedido Guteli
      Pedido: GTL-20260916-002
      Cliente: José Pérez
      Teléfono: +502 4111 2233
      Modalidad: Entrega
      Ubicación de entrega: 15 avenida 12-34, zona 10, Edificio Largo, nivel 8, oficina 802
      Fecha solicitada: 2026-09-22
      Productos:
      - 3 × Tarta de limón grande
      Subtotal: Q450
      Cotización de entrega: Pendiente
      Administrar: https://admin.guteli.test/backoffice/admin/orders/GTL-20260916-002",
        "publicOrderId": "GTL-20260916-002",
        "templateContractVersion": "guteli-owner-order-created-v1",
      }
    `);
    expect(message.bodyText).toContain('Teléfono: +502 4111 2233');
    expect(message.bodyText).toContain(
      'Ubicación de entrega: 15 avenida 12-34, zona 10, Edificio Largo, nivel 8, oficina 802',
    );
  });

  it('ignores browser-like destination and secret fields and derives only a safe admin URL', () => {
    const unsafeInput = {
      publicId: '../receipt?token=attacker',
      customerName: 'Cliente',
      phone: '+502 5555 0000',
      fulfillment: 'PICKUP' as const,
      deliveryLocation: null,
      requestedDate: '2026-09-23',
      items: [{ productName: 'Brownie', quantity: 1 }],
      subtotalMinor: 2500,
      shippingMinor: 0,
      totalMinor: 2500,
      notes: null,
      destination: '15550001111',
      receiptToken: 'receipt-secret',
      session: 'session-secret',
      internalId: '66d38d4c-8eaa-4c9c-b431-f5bde2575afd',
      cardNumber: '4111111111111111',
      rawError: 'database password leaked',
    };

    const message = buildOwnerOrderMessage(unsafeInput, {
      publicAdminBaseUrl,
    });
    const serialized = JSON.stringify(message);

    expect(message.adminOrderUrl).toBe(
      'https://admin.guteli.test/backoffice/admin/orders/..%2Freceipt%3Ftoken%3Dattacker',
    );
    expect(serialized).not.toContain('15550001111');
    expect(serialized).not.toContain('receipt-secret');
    expect(serialized).not.toContain('session-secret');
    expect(serialized).not.toContain('66d38d4c');
    expect(serialized).not.toContain('4111111111111111');
    expect(serialized).not.toContain('database password leaked');
    expect(message).not.toHaveProperty('destination');
  });

  it('rejects inconsistent delivery data and non-HTTPS admin bases', () => {
    const delivery = {
      publicId: 'GTL-20260916-003',
      customerName: 'Cliente',
      phone: '+502 5555 0000',
      fulfillment: 'DELIVERY' as const,
      deliveryLocation: null,
      requestedDate: '2026-09-23',
      items: [{ productName: 'Brownie', quantity: 1 }],
      subtotalMinor: 2500,
      shippingMinor: null,
      totalMinor: null,
      notes: null,
    };

    expect(() =>
      buildOwnerOrderMessage(delivery, { publicAdminBaseUrl }),
    ).toThrow('Invalid owner order message');
    expect(() =>
      buildOwnerOrderMessage(
        { ...delivery, deliveryLocation: 'Zona 10' },
        { publicAdminBaseUrl: 'http://admin.guteli.test' },
      ),
    ).toThrow('Invalid public admin base URL');
  });
});
