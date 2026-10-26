import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { compileCoverage, type DeliveryPoint } from './coverage';

export type DeliveryInput = {
  fulfillment: 'pickup' | 'delivery';
  address?: string;
  point?: DeliveryPoint;
  confirmed?: boolean;
};
export type DeliveryQuote = {
  kind: 'pickup' | 'manual' | 'automatic';
  shippingMinor: number | null;
  areaId?: string;
  version?: string;
  token?: string;
  expiresAt?: string;
};
export type DeliveryService = ReturnType<typeof createDeliveryService>;
const TTL = 600_000;
const normalize = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Zs}/gu, ' ')
    .trim();
export function createDeliveryService(config: {
  coverage: unknown;
  secret: string;
  enabled: boolean;
}) {
  const coverage = compileCoverage(config.coverage);
  const enabled =
    config.enabled && Buffer.byteLength(config.secret) >= 32 && coverage.valid;
  const mac = (s: string) =>
    createHmac('sha256', config.secret)
      .update('guteli-delivery-v1\0')
      .update(s)
      .digest('base64url');
  const binding = (input: DeliveryInput) =>
    mac(
      JSON.stringify([
        normalize(input.address ?? ''),
        input.point?.lng,
        input.point?.lat,
        input.confirmed === true,
      ]),
    );
  const classify = (input: DeliveryInput): DeliveryQuote => {
    if (input.fulfillment === 'pickup')
      return { kind: 'pickup', shippingMinor: 0 };
    if (!enabled || !input.confirmed || !input.address?.trim())
      return { kind: 'manual', shippingMinor: null };
    const result = coverage.classify(input.point);
    return result.kind === 'automatic'
      ? result
      : { kind: 'manual', shippingMinor: null };
  };
  return {
    quote(input: DeliveryInput, now: Date): DeliveryQuote {
      const result = classify(input);
      if (result.kind !== 'automatic') return result;
      const expires = now.getTime() + TTL;
      const payload = Buffer.from(
        JSON.stringify({
          binding: binding(input),
          areaId: result.areaId,
          version: result.version,
          shippingMinor: result.shippingMinor,
          expires,
        }),
      ).toString('base64url');
      return {
        ...result,
        token: payload + '.' + mac(payload),
        expiresAt: new Date(expires).toISOString(),
      };
    },
    verify(input: DeliveryInput, token: string, now: Date): DeliveryQuote {
      const fail = () => {
        throw new Error('DELIVERY_QUOTE_STALE');
      };
      if (!enabled || token.length > 2048 || !Number.isFinite(now.getTime()))
        return fail();
      const [payload, signature, ...extra] = token.split('.');
      if (!payload || !signature || extra.length) return fail();
      const expected = Buffer.from(mac(payload)),
        received = Buffer.from(signature);
      if (
        expected.length !== received.length ||
        !timingSafeEqual(expected, received)
      )
        return fail();
      let saved;
      try {
        saved = JSON.parse(Buffer.from(payload, 'base64url').toString());
      } catch {
        return fail();
      }
      const result = classify(input);
      if (
        !saved ||
        !Number.isSafeInteger(saved.expires) ||
        saved.expires <= +now ||
        saved.expires > +now + TTL ||
        saved.binding !== binding(input) ||
        result.kind !== 'automatic' ||
        saved.areaId !== result.areaId ||
        saved.version !== result.version ||
        saved.shippingMinor !== result.shippingMinor
      )
        return fail();
      return result;
    },
  };
}
// No real polygons are approved. Flags/keys alone cannot enable a tariff.
// Replace this catalogue only through a reviewed change with provenance and approval.
const approvedCoverage = {
  type: 'FeatureCollection',
  version: 'pending-owner-geometries',
  features: [],
};
export function getDeliveryService() {
  return createDeliveryService({
    coverage: approvedCoverage,
    enabled: process.env.DELIVERY_COVERAGE_ENABLED === 'true',
    secret: process.env.DELIVERY_QUOTE_SECRET ?? '',
  });
}
