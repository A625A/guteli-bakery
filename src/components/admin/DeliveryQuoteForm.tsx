'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function money(minor: number) {
  return `Q${(minor / 100).toFixed(2)}`;
}

type MutationResponse = Readonly<{
  order?: {
    shippingMinor: number | null;
    totalMinor: number | null;
    version: number;
  };
  error?: { message?: string };
}>;

export function DeliveryQuoteForm({
  publicId,
  initialShippingMinor,
  initialTotalMinor,
  initialVersion,
}: {
  publicId: string;
  initialShippingMinor: number | null;
  initialTotalMinor: number | null;
  initialVersion: number;
}) {
  const router = useRouter();
  const [shippingMinor, setShippingMinor] = useState(initialShippingMinor);
  const [totalMinor, setTotalMinor] = useState(initialTotalMinor);
  const [version, setVersion] = useState(initialVersion);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function receiveVersion(event: Event) {
      const detail = (
        event as CustomEvent<{ publicId: string; version: number }>
      ).detail;
      if (detail.publicId === publicId) setVersion(detail.version);
    }
    window.addEventListener('guteli-order-version', receiveVersion);
    return () =>
      window.removeEventListener('guteli-order-version', receiveVersion);
  }, [publicId]);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const input = Number(formData.get('shippingMinor'));
      const response = await fetch(
        `/api/admin/orders/${publicId}/delivery-quote`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            shippingMinor: input,
            expectedVersion: version,
          }),
        },
      );
      const payload = (await response.json()) as MutationResponse;
      if (!response.ok || !payload.order) {
        throw new Error(
          payload.error?.message ?? 'No se pudo guardar la cotización.',
        );
      }
      setShippingMinor(payload.order.shippingMinor);
      setTotalMinor(payload.order.totalMinor);
      setVersion(payload.order.version);
      setMessage(
        `Cotización guardada. Total ${money(payload.order.totalMinor!)}.`,
      );
      window.dispatchEvent(
        new CustomEvent('guteli-order-version', {
          detail: { publicId, version: payload.order.version },
        }),
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la cotización.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="delivery-quote-title" className="admin-auth-card">
      <h2 id="delivery-quote-title">Cotización de entrega</h2>
      <p>
        Envío actual:{' '}
        {shippingMinor === null ? 'Pendiente' : money(shippingMinor)}
      </p>
      <p>Total: {totalMinor === null ? 'Pendiente' : money(totalMinor)}</p>
      <form action={submit}>
        <label htmlFor="shipping-minor">Envío (centavos)</label>
        <input
          id="shipping-minor"
          name="shippingMinor"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          defaultValue={shippingMinor ?? ''}
          required
        />
        <button disabled={pending} type="submit">
          Guardar cotización
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
