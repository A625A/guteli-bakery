import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  createDeliveryService,
  getDeliveryService,
} from '@/server/delivery/service';
import { coverage } from '../support/delivery/coverage';
const now = new Date('2026-10-25T12:00:00Z');
const key = 'test-only-quote-secret-'.repeat(3);
const input = {
  fulfillment: 'delivery' as const,
  address: 'Zona 10, municipio ficticio',
  point: { lng: 1, lat: 1 },
  confirmed: true,
};
const service = () =>
  createDeliveryService({ coverage: coverage(), secret: key, enabled: true });
describe('server delivery quotes', () => {
  it('pickup alone is Q0; missing/unconfirmed point remains manual', () => {
    expect(service().quote({ fulfillment: 'pickup' }, now)).toMatchObject({
      shippingMinor: 0,
    });
    expect(service().quote({ ...input, point: undefined }, now)).toMatchObject({
      shippingMinor: null,
    });
    expect(service().quote({ ...input, confirmed: false }, now)).toMatchObject({
      shippingMinor: null,
    });
  });
  it('never classifies by street/municipality words', () => {
    expect(
      service().quote(
        {
          ...input,
          point: { lng: 10, lat: 10 },
          address: 'CAES km 20 Fraijanes zona 10',
        },
        now,
      ).shippingMinor,
    ).toBeNull();
    expect(
      service().quote(
        { ...input, address: 'Zona 10 de otro municipio', point: undefined },
        now,
      ).shippingMinor,
    ).toBeNull();
  });
  it('signs a 10-minute quote without plaintext address/point and recalculates on verification', () => {
    const quote = service().quote(input, now);
    expect(quote.shippingMinor).toBe(1000);
    expect(quote.token).toBeTruthy();
    const payload = Buffer.from(
      quote.token!.split('.')[0],
      'base64url',
    ).toString();
    expect(payload).not.toContain(input.address);
    expect(service().verify(input, quote.token!, now)).toMatchObject({
      shippingMinor: 1000,
      areaId: 'q10',
    });
  });
  it('rejects tampering, changed address/point, expiry and changed coverage', () => {
    const token = service().quote(input, now).token!;
    for (const [request, value, time] of [
      [input, token + 'x', now],
      [{ ...input, address: 'another' }, token, now],
      [{ ...input, point: { lng: 5, lat: 1 } }, token, now],
      [input, token, new Date(+now + 600000)],
    ] as const)
      expect(() => service().verify(request, value, time)).toThrow(
        'DELIVERY_QUOTE_STALE',
      );
    const newer = createDeliveryService({
      coverage: { ...coverage(), version: 'test-v2' },
      secret: key,
      enabled: true,
    });
    expect(() => newer.verify(input, token, now)).toThrow(
      'DELIVERY_QUOTE_STALE',
    );
  });
  it('configuration absent cannot activate automatic rates', () => {
    expect(getDeliveryService().quote(input, now).shippingMinor).toBeNull();
    expect(
      createDeliveryService({
        coverage: coverage(),
        enabled: true,
        secret: '',
      }).quote(input, now).shippingMinor,
    ).toBeNull();
  });
});
