'use client';
import { useCallback, useRef, useState } from 'react';
import type { CheckoutPricingReview } from '@/domain/checkout-pricing';
import { formatGTQ } from '@/lib/money';
import { useLiveResource } from '@/lib/use-live-resource';
import type { PublicReceipt } from '@/server/orders/get-receipt';

export function checkoutRefreshDelay(value: {
  review: CheckoutPricingReview | null;
  receipt: PublicReceipt;
}) {
  const review = value.review ?? value.receipt;
  return review?.validUntil
    ? Date.parse(review.validUntil) - Date.parse(review.pricedAt)
    : 30000;
}

export function useCheckoutReview(
  initial: PublicReceipt,
  receiptToken?: string,
) {
  const mutation = useRef<Promise<void> | null>(null);
  const read = useCallback(async () => {
    // A poll never overtakes a customer acceptance mutation.
    if (mutation.current) await mutation.current;
    if (!receiptToken) return { receipt: initial, review: null };
    const receiptResponse = await fetch(
      `/api/order-status/${encodeURIComponent(receiptToken)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) },
    );
    if (!receiptResponse.ok) throw new Error('Receipt unavailable');
    const { receipt } = (await receiptResponse.json()) as {
      receipt: PublicReceipt;
    };
    const ownerResponse = await fetch('/api/checkout-review', {
      cache: 'no-store',
    });
    if (ownerResponse.status === 404) return { receipt, review: null };
    if (!ownerResponse.ok) throw new Error('Review unavailable');
    const { review } = (await ownerResponse.json()) as {
      review: CheckoutPricingReview;
    };
    if (review.publicId !== initial.publicId) return { receipt, review: null };
    return {
      receipt: {
        ...receipt,
        items: review.items,
        subtotalMinor: review.subtotalMinor,
        shippingMinor: review.shippingMinor,
        totalMinor: review.totalMinor,
        paymentMethod: review.paymentMethod,
        paymentStatus: review.paymentStatus,
        orderStatus: review.orderStatus,
      },
      review,
    };
  }, [initial, receiptToken]);
  const live = useLiveResource<{
    receipt: PublicReceipt;
    review: CheckoutPricingReview | null;
  }>({ receipt: initial, review: null }, read, checkoutRefreshDelay);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function accept() {
    const review = live.data.review;
    if (!review?.revisionId || !live.available || mutation.current) return;
    setPending(true);
    setMessage('');
    mutation.current = (async () => {
      try {
        const response = await fetch('/api/checkout-review', {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            publicId: review.publicId,
            revisionId: review.revisionId,
          }),
        });
        if (response.status === 409)
          setMessage(
            'El precio o la disponibilidad cambió. Revisa el total actualizado y vuelve a aceptarlo.',
          );
        else if (!response.ok) throw new Error('Unavailable');
      } catch {
        setMessage(
          'No pudimos confirmar tu aceptación. Actualiza e inténtalo de nuevo.',
        );
      }
    })();
    await mutation.current;
    mutation.current = null;
    await live.refresh();
    setPending(false);
  }
  return { ...live, pending, message, accept };
}

export function CheckoutPriceReview({
  state,
}: {
  state: ReturnType<typeof useCheckoutReview>;
}) {
  const review = state.data.review;
  return (
    <section aria-label="Revisión del total">
      {!state.available ? (
        <p role="status">
          No se ha confirmado el precio actual. Actualizando el pedido…
        </p>
      ) : null}
      {state.message ? <p role="alert">{state.message}</p> : null}
      {review &&
      review.paymentStatus !== 'PAID' &&
      review.paymentStatus !== 'REFUNDED' ? (
        <>
          <h2>Revisa y acepta el total actual</h2>
          <p>
            Los precios pueden cambiar hasta verificar el pago. Aceptar este
            total no realiza ningún cobro.
          </p>
          {review.accepted && state.available && !state.pending ? (
            <p role="status">
              Total aceptado: {formatGTQ(review.totalMinor!)}. Los pagos en
              línea siguen deshabilitados.
            </p>
          ) : null}
          {review.canAccept ? (
            <button
              type="button"
              disabled={!state.available || state.pending || review.accepted}
              onClick={() => void state.accept()}
            >
              Acepto el total de {formatGTQ(review.totalMinor!)}
            </button>
          ) : (
            <p>
              El pedido todavía no está disponible para aceptar: comprueba la
              fecha, los productos y el costo de envío.
            </p>
          )}
          <button type="button" disabled>
            Pagar en línea — Próximamente
          </button>
        </>
      ) : null}
      {!state.available ? (
        <button type="button" onClick={() => void state.refresh()}>
          Actualizar pedido
        </button>
      ) : null}
    </section>
  );
}
