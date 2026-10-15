'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  paymentMethods,
  paymentMethodLabel,
  methodMatchesFulfillment,
  type PaymentMethod,
} from '@/domain/payment-method';

export function PaymentMethodForm({
  publicId,
  fulfillment,
  initialVersion,
  initialMethod,
  initialDraft,
}: {
  publicId: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  initialVersion: number;
  initialMethod: PaymentMethod | null;
  initialDraft: string | null;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(initialVersion);
  const [method, setMethod] = useState(initialMethod ?? '');
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (
        event as CustomEvent<{ publicId: string; version: number }>
      ).detail;
      if (detail.publicId === publicId) setVersion(detail.version);
    };
    window.addEventListener('guteli-order-version', update);
    return () => window.removeEventListener('guteli-order-version', update);
  }, [publicId]);
  async function save() {
    if (pending) return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/admin/orders/${publicId}/payment-method`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: method,
            instructionsDraft: method === 'BANK_TRANSFER' ? draft : '',
            expectedVersion: version,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.order) {
        setMessage(
          payload.error?.message ??
            'No se pudo guardar el método. Actualiza e inténtalo de nuevo.',
        );
        return;
      }
      setVersion(payload.order.version);
      window.dispatchEvent(
        new CustomEvent('guteli-order-version', {
          detail: { publicId, version: payload.order.version },
        }),
      );
      setMessage(
        'Método guardado. No se ha registrado ni verificado ningún cobro.',
      );
      router.refresh();
    } catch {
      setMessage(
        'No se pudo comprobar el cambio. Actualiza el pedido antes de intentar de nuevo.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="admin-auth-card" aria-labelledby="payment-method-title">
      <h2 id="payment-method-title">Elegir método de pago</h2>
      <p>
        Solo el dueño puede elegirlo. Esta acción no cobra ni marca el pedido
        como pagado.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor="payment-method">Método de pago del pedido</label>
        <select
          id="payment-method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          required
          disabled={pending}
        >
          <option value="">Pendiente de definir</option>
          {paymentMethods
            .filter((item) => methodMatchesFulfillment(item, fulfillment))
            .map((item) => (
              <option key={item} value={item}>
                {paymentMethodLabel(item)}
              </option>
            ))}
        </select>
        {method === 'BANK_TRANSFER' ? (
          <>
            <label htmlFor="instructions-draft">
              Borrador privado de instrucciones
            </label>
            <textarea
              id="instructions-draft"
              name="instructionsDraft"
              maxLength={500}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={pending}
              aria-describedby="draft-help"
            />
            <p id="draft-help">
              Solo visible para el dueño. No se comparte con el cliente ni se
              envía por WhatsApp. No ingreses contraseñas ni credenciales
              bancarias.
            </p>
          </>
        ) : null}
        <button disabled={pending || !method} type="submit">
          Guardar método
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
