import { z } from 'zod';
import {
  getOrderSecuritySettings,
  type OrderSecuritySettings,
} from '@/server/config/order-security-env';
import { errorResponse } from '@/server/http/error-response';
import { getRequestId } from '@/server/observability/request-id';
import { readCheckoutCredential } from '@/server/orders/checkout-credential';
import {
  CREATE_ORDER_OPERATION,
  findIdempotentOrder,
} from '@/server/orders/repository';
import { reviewPricingInTransaction } from '@/server/orders/review-pricing';
import type { OrdersDatabase } from '@/server/orders/types';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { createHmacSubject } from '@/server/security/client-subject';
import {
  InvalidMutationOriginError,
  requireTrustedMutationOrigin,
} from '@/server/security/origin';

export const dynamic = 'force-dynamic';
const acceptanceSchema = z
  .object({
    publicId: z.string().min(1).max(32),
    revisionId: z.string().uuid(),
  })
  .strict();
type Dependencies = {
  database?: OrdersDatabase;
  now?: () => Date;
  getOrderSecuritySettings?: () => OrderSecuritySettings;
  applicationOrigin?: string;
  secureCookies?: boolean;
};

export function createCheckoutReviewHandlers(dependencies: Dependencies = {}) {
  async function handle(request: Request, accept: boolean) {
    const requestId = getRequestId(request.headers);
    const fail = (code: string, status: number) =>
      errorResponse(
        {
          code,
          message:
            'No se pudo revisar este pedido. Actualiza e inténtalo de nuevo.',
          requestId,
        },
        status,
      );
    try {
      if (accept)
        requireTrustedMutationOrigin(
          request.headers,
          dependencies.applicationOrigin,
        );
      const settings = (
        dependencies.getOrderSecuritySettings ?? getOrderSecuritySettings
      )();
      const clock = dependencies.now ?? (() => new Date());
      const credential = readCheckoutCredential(
        request.headers,
        settings.receiptTokenSecret,
        clock(),
        dependencies.secureCookies ?? process.env.NODE_ENV === 'production',
      );
      if (!credential) return fail('CHECKOUT_NOT_FOUND', 404);
      let expected: z.infer<typeof acceptanceSchema> | undefined;
      if (accept) {
        if (
          !request.headers.get('content-type')?.startsWith('application/json')
        )
          return fail('VALIDATION_ERROR', 400);
        const raw = await request.text();
        if (raw.length > 256) return fail('VALIDATION_ERROR', 400);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return fail('VALIDATION_ERROR', 400);
        }
        const parsed = acceptanceSchema.safeParse(body);
        if (!parsed.success) return fail('VALIDATION_ERROR', 400);
        expected = parsed.data;
      }
      const db =
        dependencies.database ?? (await import('@/server/db/client')).db;
      const review = await db.transaction(async (transaction) => {
        await acquireCatalogMutationLock(transaction);
        const order = await findIdempotentOrder(
          transaction,
          CREATE_ORDER_OPERATION,
          createHmacSubject(
            settings.receiptTokenSecret,
            'public-order-idempotency',
            'public-storefront',
          ),
          credential.key,
        );
        if (!order || (expected && expected.publicId !== order.publicId))
          return null;
        // Recheck expiry after a lock wait too. A stale credential never accepts a total.
        if (
          !readCheckoutCredential(
            request.headers,
            settings.receiptTokenSecret,
            clock(),
            dependencies.secureCookies ?? process.env.NODE_ENV === 'production',
          )
        )
          return null;
        return reviewPricingInTransaction(
          transaction,
          order.id,
          clock,
          expected?.revisionId,
          (now) =>
            Boolean(
              readCheckoutCredential(
                request.headers,
                settings.receiptTokenSecret,
                now,
                dependencies.secureCookies ??
                  process.env.NODE_ENV === 'production',
              ),
            ),
        );
      });
      if (!review) return fail('CHECKOUT_NOT_FOUND', 404);
      return Response.json(
        { review },
        {
          status: review.conflict ? 409 : 200,
          headers: {
            'cache-control': 'private, no-store',
            'referrer-policy': 'no-referrer',
            'x-request-id': requestId,
          },
        },
      );
    } catch (error) {
      return error instanceof InvalidMutationOriginError
        ? fail('INVALID_ORIGIN', 403)
        : fail('INTERNAL_ERROR', 503);
    }
  }
  return {
    GET: (request: Request) => handle(request, false),
    POST: (request: Request) => handle(request, true),
  };
}
export const { GET, POST } = createCheckoutReviewHandlers();
