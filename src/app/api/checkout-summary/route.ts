import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { buildCheckoutSummary } from '@/lib/order-summary';
import {
  getOrderSecuritySettings,
  type OrderSecuritySettings,
} from '@/server/config/order-security-env';
import { orders } from '@/server/db/schema';
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
const schema = z
  .object({
    publicId: z.string().min(1).max(32),
    expectedVersion: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const headers = {
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};
type Dependencies = {
  database?: OrdersDatabase;
  now?: () => Date;
  getOrderSecuritySettings?: () => OrderSecuritySettings;
  applicationOrigin?: string;
  secureCookies?: boolean;
};

export function createCheckoutSummaryHandler(dependencies: Dependencies = {}) {
  return async function POST(request: Request) {
    const fail = (status: number) =>
      Response.json(
        {
          error: {
            message:
              'No pudimos preparar el resumen. Vuelve a revisar tu pedido o contacta a Güteli.',
          },
        },
        { status, headers },
      );
    try {
      requireTrustedMutationOrigin(
        request.headers,
        dependencies.applicationOrigin,
      );
      const settings = (
        dependencies.getOrderSecuritySettings ?? getOrderSecuritySettings
      )();
      const clock = dependencies.now ?? (() => new Date());
      const readCredential = () =>
        readCheckoutCredential(
          request.headers,
          settings.receiptTokenSecret,
          clock(),
          dependencies.secureCookies ?? process.env.NODE_ENV === 'production',
        );
      const credential = readCredential();
      if (!credential) return fail(404);
      if (
        !request.headers.get('content-type')?.startsWith('application/json') ||
        !request.body
      )
        return fail(400);
      // Consume a bounded body; no customer details belong in this request or URL.
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 512) {
          await reader.cancel();
          return fail(400);
        }
        chunks.push(part.value);
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return fail(400);
      }
      const parsed = schema.safeParse(body);
      if (!parsed.success) return fail(400);
      const db =
        dependencies.database ?? (await import('@/server/db/client')).db;
      const summary = await db.transaction(async (transaction) => {
        await acquireCatalogMutationLock(transaction);
        const found = await findIdempotentOrder(
          transaction,
          CREATE_ORDER_OPERATION,
          createHmacSubject(
            settings.receiptTokenSecret,
            'public-order-idempotency',
            'public-storefront',
          ),
          credential.key,
        );
        if (
          !found ||
          found.publicId !== parsed.data.publicId ||
          !readCredential()
        )
          return null;
        const review = await reviewPricingInTransaction(
          transaction,
          found.id,
          clock,
        );
        if (!review || !readCredential()) return null;
        const [order] = await transaction
          .select({
            customerName: orders.customerName,
            phone: orders.phone,
            fulfillment: orders.fulfillment,
            requestedDate: orders.requestedDate,
            deliveryLocation: orders.deliveryLocation,
            notes: orders.notes,
            anonymizedAt: orders.anonymizedAt,
          })
          .from(orders)
          .where(eq(orders.id, found.id));
        if (!order || !readCredential()) return null;
        const { anonymizedAt, ...details } = order;
        if (anonymizedAt) return null;
        // Compare semantic content, not the timestamp that changes on each refresh.
        const { pricedAt, ...content } = review;
        const version = createHash('sha256')
          .update(JSON.stringify({ details, content }))
          .digest('hex');
        return {
          version,
          message: buildCheckoutSummary({ ...details, ...review }),
          pricedAt,
          validUntil: review.validUntil,
        };
      });
      if (!summary || !readCredential()) return fail(404);
      return Response.json(
        { summary },
        {
          status:
            parsed.data.expectedVersion &&
            parsed.data.expectedVersion !== summary.version
              ? 409
              : 200,
          headers,
        },
      );
    } catch (error) {
      return fail(error instanceof InvalidMutationOriginError ? 403 : 503);
    }
  };
}
export const POST = createCheckoutSummaryHandler();
