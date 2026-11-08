import 'server-only';
import { z } from 'zod';
import {
  commercialOrdersEnabled,
  commercialDemoResponse,
} from '@/server/config/commerce';
import { getOrderSecuritySettings } from '@/server/config/order-security-env';
import {
  requireTrustedMutationOrigin,
  InvalidMutationOriginError,
} from '@/server/security/origin';
import {
  createHmacSubject,
  getTrustedClientAddress,
} from '@/server/security/client-subject';
import { consumeFixedWindowRateLimit } from '@/server/security/rate-limit';
import { privateHeaders } from '@/server/privacy/headers';
import { deliveryPointSchema } from '@/domain/delivery';
import { getDeliveryService, type DeliveryService } from './service';
import { readBoundedBody, searchAddresses } from './provider';
const searchSchema = z
  .object({
    address: z.string().trim().min(3).max(300),
    consent: z.literal(true),
  })
  .strict();
const quoteSchema = z
  .object({
    fulfillment: z.enum(['pickup', 'delivery']),
    address: z.string().trim().max(300).optional(),
    point: deliveryPointSchema.optional(),
    confirmed: z.boolean().optional(),
  })
  .strict();
export async function deliveryRateLimit(request: Request, external = false) {
  const settings = getOrderSecuritySettings();
  const address = getTrustedClientAddress(request, {
    trustedProxyHops: settings.trustedProxyHops,
    directAddress: undefined,
  });
  const { db } = await import('@/server/db/client');
  const now = new Date();
  return db.transaction(async (tx) => {
    const limited = await consumeFixedWindowRateLimit(tx, {
      policy: 'DELIVERY_IP',
      subject: createHmacSubject(settings.rateLimitSecret, 'delivery', address),
      limit: 120,
      windowMs: 60_000,
      now,
    });
    if (!limited.allowed) return false;
    if (!external) return true;
    // Conservative shared provider budget: count each tile as one full credit.
    for (const [policy, limit, windowMs] of [
      ['DELIVERY_PROVIDER_SECOND', 4, 1000],
      ['DELIVERY_PROVIDER_DAY', 2500, 86400000],
    ] as const) {
      if (
        !(
          await consumeFixedWindowRateLimit(tx, {
            policy,
            subject: 'geoapify',
            limit,
            windowMs,
            now,
          })
        ).allowed
      )
        return false;
    }
    return true;
  });
}
export function createDeliveryHandlers(
  deps: {
    service?: DeliveryService;
    search?: typeof searchAddresses;
    rateLimit?: typeof deliveryRateLimit;
    now?: () => Date;
    origin?: string;
  } = {},
) {
  async function handle(request: Request, search: boolean) {
    if (!commercialOrdersEnabled()) return commercialDemoResponse();
    const reply = (value: unknown, status = 200) =>
      Response.json(value, { status, headers: privateHeaders });
    try {
      requireTrustedMutationOrigin(request.headers, deps.origin);
      if (
        !request.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      )
        return reply({ error: 'VALIDATION_ERROR' }, 400);
      if (!(await (deps.rateLimit ?? deliveryRateLimit)(request, search)))
        return reply({ error: 'RATE_LIMITED' }, 429);
      let raw: unknown;
      try {
        raw = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            await readBoundedBody(request.body, 4096),
          ),
        );
      } catch {
        return reply({ error: 'VALIDATION_ERROR' }, 400);
      }
      if (search) {
        const parsed = searchSchema.safeParse(raw);
        if (!parsed.success) return reply({ error: 'VALIDATION_ERROR' }, 400);
        return reply(
          await (deps.search ?? searchAddresses)(
            parsed.data.address,
            parsed.data.consent,
          ),
        );
      }
      const parsed = quoteSchema.safeParse(raw);
      if (!parsed.success) return reply({ error: 'VALIDATION_ERROR' }, 400);
      return reply({
        quote: (deps.service ?? getDeliveryService()).quote(
          parsed.data,
          (deps.now ?? (() => new Date()))(),
        ),
      });
    } catch (error) {
      return reply(
        {
          error:
            error instanceof InvalidMutationOriginError
              ? 'INVALID_ORIGIN'
              : 'DELIVERY_UNAVAILABLE',
        },
        error instanceof InvalidMutationOriginError ? 403 : 503,
      );
    }
  }
  return {
    search: (request: Request) => handle(request, true),
    quote: (request: Request) => handle(request, false),
  };
}
