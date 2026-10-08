'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { checkoutSession } from '@/lib/checkout-session';
import type { AcceptedOrder } from '@/lib/order-api';

type Recovery =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'saved'; order: AcceptedOrder };

export function CheckoutRecovery({
  onAvailable,
}: {
  onAvailable: (available: boolean) => void;
}) {
  const [state, setState] = useState<Recovery>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    checkoutSession()
      .then(({ order }) => {
        if (!active) return;
        setState(order ? { kind: 'saved', order } : { kind: 'empty' });
        onAvailable(!order);
      })
      .catch(() => {
        if (active) {
          setState({ kind: 'error' });
          onAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [onAvailable]);

  async function retryOrStart(action: 'read' | 'new') {
    setBusy(true);
    onAvailable(false);
    try {
      const { order } = await checkoutSession(
        action,
        state.kind === 'saved' ? state.order.publicId : undefined,
      );
      setState(order ? { kind: 'saved', order } : { kind: 'empty' });
      onAvailable(!order);
    } catch {
      setState({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'empty') return null;
  if (state.kind === 'loading')
    return <p role="status">Comprobando si tu pedido ya fue guardado…</p>;
  if (state.kind === 'error')
    return (
      <section aria-label="Recuperar pedido">
        <p role="alert">
          No pudimos comprobar tu pedido guardado. Revisa tu conexión antes de
          enviar otra solicitud.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void retryOrStart('read')}
        >
          Volver a comprobar
        </button>
      </section>
    );
  return (
    <section aria-label="Pedido guardado">
      <h2>Ya guardamos tu pedido</h2>
      <p>
        {state.order.publicId}. Revisa el pedido antes de enviar otra solicitud.
        Guardarlo no confirma pago ni disponibilidad de producción.
      </p>
      <Link
        className="button-link button-link--primary"
        href={`/order/confirmation/${encodeURIComponent(state.order.receiptToken)}/`}
      >
        Ver mi pedido guardado
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => void retryOrStart('new')}
      >
        Quiero crear otro pedido
      </button>
    </section>
  );
}
