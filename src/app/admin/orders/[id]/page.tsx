import { PaymentMethodForm } from '@/components/admin/PaymentMethodForm';
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/domain/payment-method';
import { whatsappDestination } from '@/domain/whatsapp-consent';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeliveryQuoteForm } from '@/components/admin/DeliveryQuoteForm';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { orderStatusLabel } from '@/lib/order-status-label';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import {
  notificationDeliveryLabel,
  notificationErrorLabel,
} from '@/lib/notification-status';
import { adminGetOrder } from '@/server/orders/admin-get-order';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Detalle de pedido | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function localDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guatemala',
  }).format(new Date(value));
}

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
  const contactNumber = whatsappDestination(order.phone);

  return (
    <main
      className="admin-dashboard admin-order-detail"
      id="main-content"
      tabIndex={-1}
    >
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Detalle operativo</p>
          <h1>Pedido {order.publicId}</h1>
          <Link href="/admin/orders">Volver a pedidos</Link>
        </div>
      </header>
      <section aria-labelledby="items-title">
        <h2 id="items-title">Productos solicitados</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <th scope="row">
                  {item.productName}
                  <small> · {item.categoryLabel}</small>
                </th>
                <td>{item.quantity}</td>
                <td>{money(item.lineTotalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Subtotal: {money(order.subtotalMinor)}</p>
        <p>Envío: {money(order.shippingMinor)}</p>
        <p>Total: {money(order.totalMinor)}</p>
      </section>
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
      {contactNumber ? (
        <a
          href={`https://wa.me/${contactNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          Contactar al cliente por WhatsApp
        </a>
      ) : (
        <p>No se pudo validar el número para abrir WhatsApp.</p>
      )}
      <section aria-labelledby="order-review-title">
        <h2 id="order-review-title">Confirmación, total y pago</h2>
        <p>Pedido: {orderStatusLabel(order.orderStatus)}</p>
        <p>
          Aceptación del total:{' '}
          {order.totalAccepted
            ? 'Aceptado por el cliente'
            : 'Pendiente de aceptación vigente'}
        </p>
        <p>Método: {paymentMethodLabel(order.paymentMethod)}</p>
        <p>Pago: {paymentStatusLabel(order.paymentStatus)}</p>
        <p>
          Confirmar el pedido significa que la tienda acepta atenderlo. No
          verifica que se haya recibido dinero.
        </p>
        {order.shippingMinor === null ? (
          <p>
            Falta cotizar el envío antes de que el cliente pueda aceptar el
            total completo.
          </p>
        ) : null}
        {order.paymentMethodUpdatedAt ? (
          <p>
            Método actualizado: {localDate(order.paymentMethodUpdatedAt)}{' '}
            (Guatemala)
          </p>
        ) : null}
      </section>
      {order.canAssignPaymentMethod ? (
        <PaymentMethodForm
          key={order.publicId}
          publicId={order.publicId}
          fulfillment={order.fulfillment}
          initialVersion={order.version}
          initialMethod={order.paymentMethod}
          initialDraft={order.paymentInstructionsDraft}
        />
      ) : null}

      {order.fulfillment === 'DELIVERY' &&
      order.paymentStatus !== 'PAID' &&
      order.paymentStatus !== 'REFUNDED' &&
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
                {orderStatusLabel(entry.from)} → {orderStatusLabel(entry.to)}
                <time dateTime={entry.createdAt}>
                  {' '}
                  · {localDate(entry.createdAt)} (Guatemala)
                </time>
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
                {notification.eventType === 'CUSTOMER_ORDER_CREATED'
                  ? 'Cliente'
                  : 'Tienda'}
                : {notificationDeliveryLabel(notification.deliveryStatus)}
                {notification.lastErrorCode
                  ? ` (${notificationErrorLabel(notification.lastErrorCode)})`
                  : ''}
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
