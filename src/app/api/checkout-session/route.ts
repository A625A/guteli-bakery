import { NextResponse } from 'next/server';

import {
  getOrderSecuritySettings,
  type OrderSecuritySettings,
} from '@/server/config/order-security-env';
import { errorResponse } from '@/server/http/error-response';
import { getRequestId } from '@/server/observability/request-id';
import {
  CHECKOUT_RECOVERY_SECONDS,
  checkoutCookieName,
  issueCheckoutCredential,
  readCheckoutCredential,
} from '@/server/orders/checkout-credential';
import { recoverCreatedOrder } from '@/server/orders/create-order';
import type { OrdersDatabase } from '@/server/orders/types';
import {
  InvalidMutationOriginError,
  requireTrustedMutationOrigin,
} from '@/server/security/origin';

export const dynamic = 'force-dynamic';

type Dependencies = Readonly<{
  database?: OrdersDatabase;
  now?: () => Date;
  getOrderSecuritySettings?: () => OrderSecuritySettings;
  applicationOrigin?: string;
  secureCookies?: boolean;
}>;

export function createCheckoutSessionHandlers(dependencies: Dependencies = {}) {
  async function handle(request: Request, prepare: boolean) {
    const requestId = getRequestId(request.headers);
    try {
      if (prepare)
        requireTrustedMutationOrigin(
          request.headers,
          dependencies.applicationOrigin,
        );
      const settings = (
        dependencies.getOrderSecuritySettings ?? getOrderSecuritySettings
      )();
      const now = dependencies.now?.() ?? new Date();
      const secure =
        dependencies.secureCookies ?? process.env.NODE_ENV === 'production';
      const existing = readCheckoutCredential(
        request.headers,
        settings.receiptTokenSecret,
        now,
        secure,
      );
      const startNew =
        prepare && request.headers.get('x-checkout-action') === 'new';
      const order = existing
        ? await recoverCreatedOrder(
            existing.key,
            settings.receiptTokenSecret,
            dependencies.database,
          )
        : null;
      if (
        startNew &&
        (!order || request.headers.get('x-checkout-order') !== order.publicId)
      )
        return errorResponse(
          {
            code: 'CHECKOUT_UNRESOLVED',
            message: 'Comprueba tu pedido antes de crear otro.',
            requestId,
          },
          409,
        );
      const credential =
        startNew || (!existing && prepare)
          ? issueCheckoutCredential(settings.receiptTokenSecret, now)
          : existing;
      const response = NextResponse.json(
        prepare
          ? { idempotencyKey: credential!.key, order: startNew ? null : order }
          : { order, ...(existing ? { idempotencyKey: existing.key } : {}) },
        {
          headers: {
            'cache-control': 'private, no-store',
            'referrer-policy': 'no-referrer',
            'x-request-id': requestId,
          },
        },
      );
      if (prepare && (!existing || startNew))
        response.cookies.set(checkoutCookieName(secure), credential!.value, {
          httpOnly: true,
          secure,
          sameSite: 'lax',
          path: '/',
          maxAge: CHECKOUT_RECOVERY_SECONDS,
        });
      return response;
    } catch (error) {
      const invalidOrigin = error instanceof InvalidMutationOriginError;
      return errorResponse(
        {
          code: invalidOrigin ? 'INVALID_ORIGIN' : 'INTERNAL_ERROR',
          message: 'No se pudo recuperar el pedido.',
          requestId,
        },
        invalidOrigin ? 403 : 503,
      );
    }
  }
  return {
    GET: (request: Request) => handle(request, false),
    POST: (request: Request) => handle(request, true),
  };
}

export const { GET, POST } = createCheckoutSessionHandlers();
