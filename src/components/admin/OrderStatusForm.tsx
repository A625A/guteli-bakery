'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { OrderStatus } from '@/domain/order-state';

const labels: Record<OrderStatus, string> = {
  RECEIVED: 'Recibido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo',
  OUT_FOR_DELIVERY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

type MutationResponse = Readonly<{
  order?: {
    orderStatus: OrderStatus;
    version: number;
    allowedTransitions: readonly OrderStatus[];
  };
  error?: { code?: string; message?: string };
}>;

export function OrderStatusForm({
  publicId,
  initialStatus,
  initialVersion,
  initialTransitions,
}: {
  publicId: string;
  initialStatus: OrderStatus;
  initialVersion: number;
  initialTransitions: readonly OrderStatus[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [version, setVersion] = useState(initialVersion);
  const [transitions, setTransitions] = useState(initialTransitions);
  const [selected, setSelected] = useState(initialTransitions[0] ?? '');
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
      const nextStatus = formData.get('status');
      const response = await fetch(`/api/admin/orders/${publicId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, expectedVersion: version }),
      });
      const payload = (await response.json()) as MutationResponse;
      if (!response.ok || !payload.order) {
        throw new Error(
          payload.error?.message ?? 'No se pudo actualizar el estado.',
        );
      }
      setStatus(payload.order.orderStatus);
      setVersion(payload.order.version);
      setTransitions(payload.order.allowedTransitions);
      setSelected(payload.order.allowedTransitions[0] ?? '');
      setMessage(`Estado actualizado a ${labels[payload.order.orderStatus]}.`);
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
          : 'No se pudo actualizar el estado.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="order-status-title" className="admin-auth-card">
      <h2 id="order-status-title">Estado del pedido</h2>
      <p>Estado actual: {labels[status]}</p>
      {transitions.length > 0 ? (
        <form action={submit}>
          <label htmlFor="order-status">Nuevo estado</label>
          <select
            id="order-status"
            name="status"
            value={selected}
            onChange={(event) => setSelected(event.target.value as OrderStatus)}
          >
            {transitions.map((transition) => (
              <option key={transition} value={transition}>
                {labels[transition]}
              </option>
            ))}
          </select>
          <button disabled={pending || !selected} type="submit">
            Actualizar estado
          </button>
        </form>
      ) : (
        <p>Este pedido está finalizado.</p>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
