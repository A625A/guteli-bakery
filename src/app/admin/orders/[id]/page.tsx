import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeliveryQuoteForm } from '@/components/admin/DeliveryQuoteForm';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminGetOrder } from '@/server/orders/admin-get-order';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Detalle de pedido | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function money(value: number | null) {
  return value === null ? 'Pendiente' : `Q${(value / 100).toFixed(2)}`;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireVerifiedAdminSession();
  const { id } = await params;
  const order = await adminGetOrder(id, await headers());
  if (!order) notFound();

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Detalle operativo</p>
          <h1>Pedido {order.publicId}</h1>
          <Link href="/admin/orders">Volver a pedidos</Link>
        </div>
      </header>
      <section aria-labelledby="customer-title">
        <h2 id="customer-title">Cliente y entrega</h2>
        <dl>
          <dt>Nombre</dt>
          <dd>{order.customerName}</dd>
          <dt>Teléfono</dt>
          <dd>{order.phone}</dd>
          <dt>Fecha solicitada</dt>
          <dd>{order.requestedDate}</dd>
          <dt>Modalidad</dt>
          <dd>{order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Recoger'}</dd>
          {order.deliveryLocation ? (
            <>
              <dt>Ubicación de entrega</dt>
              <dd>{order.deliveryLocation}</dd>
            </>
          ) : null}
          {order.notes ? (
            <>
              <dt>Notas</dt>
              <dd>{order.notes}</dd>
            </>
          ) : null}
        </dl>
      </section>
      <section aria-labelledby="items-title">
        <h2 id="items-title">Productos confirmados</h2>
        <ul>
          {order.items.map((item, index) => (
            <li key={`${item.productName}-${index}`}>
              {item.quantity} × {item.productName} ({item.categoryLabel}) —{' '}
              {money(item.lineTotalMinor)}
            </li>
          ))}
        </ul>
        <p>Subtotal: {money(order.subtotalMinor)}</p>
        <p>Envío: {money(order.shippingMinor)}</p>
        <p>Total: {money(order.totalMinor)}</p>
      </section>
      {order.fulfillment === 'DELIVERY' &&
      order.orderStatus !== 'COMPLETED' &&
      order.orderStatus !== 'CANCELLED' ? (
        <DeliveryQuoteForm
          publicId={order.publicId}
          initialShippingMinor={order.shippingMinor}
          initialTotalMinor={order.totalMinor}
          initialVersion={order.version}
        />
      ) : null}
      <OrderStatusForm
        publicId={order.publicId}
        initialStatus={order.orderStatus}
        initialVersion={order.version}
        initialTransitions={order.allowedTransitions}
      />
      <section aria-labelledby="history-title">
        <h2 id="history-title">Historial de estado</h2>
        {order.statusHistory.length ? (
          <ol>
            {order.statusHistory.map((entry) => (
              <li key={`${entry.createdAt}-${entry.to}`}>
                {entry.from} → {entry.to}
              </li>
            ))}
          </ol>
        ) : (
          <p>Sin cambios registrados.</p>
        )}
      </section>
      <section aria-labelledby="notifications-title">
        <h2 id="notifications-title">Notificaciones</h2>
        {order.notifications.length ? (
          <ul>
            {order.notifications.map((notification) => (
              <li key={`${notification.eventType}-${notification.createdAt}`}>
                {notification.eventType}: {notification.state}
              </li>
            ))}
          </ul>
        ) : (
          <p>Sin notificaciones registradas.</p>
        )}
      </section>
    </main>
  );
}
